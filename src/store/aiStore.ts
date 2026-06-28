import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { aiProvider } from '@/ai/provider/index';
import { AiError } from '@/ai/provider/types';
import type { AiErrorKind } from '@/ai/provider/types';

import {
  resolveKeyStatus,
  unlockWithPassphrase,
  revealKey,
  encryptNewKey,
  reEncryptKeyWithNewPassphrase,
  clearAllKekState,
  encryptWithSessionKek,
  decryptWithSessionKek,
  clearSessionKek,
  activateKek,
} from '@/ai/keyVault/keyVault';
import type { KeyStatus } from '@/ai/keyVault/keyVault';

import {
  getKeyBlob,
  putKeyBlob,
  deleteKeyBlob,
  getConversation,
  putConversation,
  deleteConversation,
} from '@/ai/cloud/aiCloud';
import type { KeyBlob, EncryptedEnvelope } from '@/ai/cloud/aiCloud';

import { emptyConversation } from '@/ai/chat/conversation.types';
import type { Conversation, Message } from '@/ai/chat/conversation.types';
import { shouldCompact, MAX_HISTORY_TOKENS } from '@/ai/chat/tokenBudget';
import { compactConversation, buildHistoryForRequest, pruneHistoryTokens } from '@/ai/chat/compaction';
import { buildContextPack, serializeContextPack } from '@/ai/context/buildContextPack';
import { SYSTEM_PROMPT, ACTION_CONTRACT } from '@/ai/config';

import { validateAction } from '@/ai/actions/validateAction';
import { applyAction } from '@/ai/actions/applyAction';
import { affordabilityWarning } from '@/ai/actions/checkFeasibility';
import { describeAction } from '@/ai/actions/describeAction';

import {
  notifyAiCloudSyncFailed,
  notifyAiKeyRemoved,
  notifyAiKeySetup,
  notifyAiPassphraseChanged,
  notifyIndexedDbUnavailable,
  notifyAiChatCompacted,
  notifyAiActionApplied,
} from '@/ai/aiNotifications';

import { usePlannerStore } from '@/store/plannerStore';
import { simulate } from '@/engine/simulate';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import { aesGcmEncrypt } from '@/ai/keyVault/crypto';
import { cacheKek, clearKek } from '@/ai/keyVault/kekCache';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AiSettings {
  disclosureAcknowledged: boolean;
}

interface AiStore {
  // State
  conversation: Conversation;
  keyStatus: KeyStatus;
  keyBlob: KeyBlob | null;
  settings: AiSettings;
  sending: boolean;
  indexedDbWarningShown: boolean;

  // Chat ETag for optimistic concurrency
  _conversationEtag: string | null;

  // Key lifecycle
  initAi: () => Promise<void>;
  setupKey(plaintextApiKey: string, passphrase: string): Promise<void>;
  unlock(passphrase: string): Promise<void>;
  changePassphrase(oldP: string, newP: string): Promise<void>;
  removeKey(): Promise<void>;
  forgotPassphrase(newKey: string, newPassphrase: string): Promise<void>;

  // Chat lifecycle
  loadConversationFromCloud(): Promise<void>;
  send(text: string): Promise<void>;
  stopStreaming(): void;
  clearChat(): Promise<void>;
  reloadChat(): Promise<void>;
  acknowledgeDisclosure(): void;
  clearForSignOut(): void;

  // Phase 2: assisted actions (propose → confirm → apply → undo)
  proposeAction(text: string): Promise<void>;
  applyProposedAction(messageId: string): void;
  dismissProposedAction(messageId: string): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPreconditionFailed(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'PreconditionFailed' || e?.$metadata?.httpStatusCode === 412;
}

async function encryptConversation(conv: Conversation): Promise<EncryptedEnvelope> {
  const { iv, ciphertext, epoch } = await encryptWithSessionKek(JSON.stringify(conv));
  return { v: 1, keyEpoch: epoch, iv, ciphertext };
}

async function decryptConversation(
  envelope: EncryptedEnvelope,
  blobEpoch: string,
): Promise<Conversation | 'epoch_mismatch' | 'decrypt_error'> {
  if (envelope.keyEpoch !== blobEpoch) return 'epoch_mismatch';
  try {
    const plaintext = await decryptWithSessionKek(envelope.iv, envelope.ciphertext, envelope.keyEpoch);
    return JSON.parse(plaintext) as Conversation;
  } catch {
    return 'decrypt_error';
  }
}

// ---------------------------------------------------------------------------
// Context-pack cache
// ---------------------------------------------------------------------------
// Building the pack re-runs simulate() and serialises the result. plannerStore
// replaces `config`/`overrides` with new object references on every plan change,
// so caching by reference identity (a) skips redundant work when the plan is
// unchanged between turns and (b) keeps the serialised block byte-identical across
// those turns — which lets Gemini's implicit prefix caching discount the repeated
// context. Accuracy is preserved: any real plan edit yields new references and a
// fresh rebuild (with a new contextEpoch).
let _ctxCache: { configRef: unknown; overridesRef: unknown; block: string; epoch: string } | null = null;

function getContextBlock(
  config: PlannerConfig,
  overrides: PlannerOverrides,
  baselineAccountIds: string[],
  baseConfig: PlannerConfig,
): { block: string; epoch: string } {
  if (_ctxCache && _ctxCache.configRef === config && _ctxCache.overridesRef === overrides) {
    return { block: _ctxCache.block, epoch: _ctxCache.epoch };
  }
  const result = simulate(config, overrides);
  // When a scenario is active, also simulate the pure base plan so the pack can carry
  // a grounded base-vs-scenario effect (scenarioEffect). simulate(baseConfig, {}) is
  // the base with no runtime events / overrides applied.
  const hasScenario = (overrides.runtimeEvents?.length ?? 0) > 0;
  const baseResult = hasScenario ? simulate(baseConfig, {}) : undefined;
  const pack = buildContextPack(result, config, overrides, baselineAccountIds, undefined, baseResult);
  const block = serializeContextPack(pack);
  const epoch = crypto.randomUUID();
  _ctxCache = { configRef: config, overridesRef: overrides, block, epoch };
  return { block, epoch };
}

// In-flight stream controller, so the panel/Stop button can cancel a send.
let _abortController: AbortController | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAiStore = create<AiStore>()(
  persist(
    (set, get) => ({
      conversation: emptyConversation(),
      keyStatus: 'absent',
      keyBlob: null,
      settings: { disclosureAcknowledged: false },
      sending: false,
      indexedDbWarningShown: false,
      _conversationEtag: null,

      // ------------------------------------------------------------------
      // Init: run after sign-in. Loads the key blob + checks KEK cache.
      // ------------------------------------------------------------------
      initAi: async () => {
        try {
          const blob = await getKeyBlob();
          if (!blob) {
            set({ keyStatus: 'absent', keyBlob: null });
            return;
          }
          const { status, kekLoaded } = await resolveKeyStatus(blob);
          set({ keyBlob: blob, keyStatus: status });

          if (kekLoaded) {
            // KEK is in cache → auto-unlock and load chat
            await get().loadConversationFromCloud();
          }
        } catch {
          // Non-fatal: AI just stays absent/locked. Never block the planner.
        }
      },

      // ------------------------------------------------------------------
      // Setup (first time or replacement)
      // ------------------------------------------------------------------
      setupKey: async (plaintextApiKey, passphrase) => {
        // 1. Validate key first — never write a blob for a bad key.
        set({ keyStatus: 'validating' });
        const valid = await aiProvider.validateKey(plaintextApiKey);
        if (!valid) {
          set({ keyStatus: 'absent' });
          throw new AiError('INVALID_KEY', 'Your API key was rejected by Gemini. Check the key and try again.');
        }

        // 2. Encrypt key + mint new epoch
        const { blob: partial, kek } = await encryptNewKey(plaintextApiKey, passphrase);
        const now = new Date().toISOString();
        const blob: KeyBlob = {
          ...partial,
          providerId: 'gemini',
          createdAt: now,
          updatedAt: now,
        };

        // 3. Upload blob
        await putKeyBlob(blob);

        // 4. Write empty encrypted conversation (same epoch) — create-only (IfNoneMatch:*)
        const emptyCov = emptyConversation();
        const { iv, ciphertext } = await aesGcmEncrypt(kek, JSON.stringify(emptyCov));
        const envelope: EncryptedEnvelope = { v: 1, keyEpoch: blob.keyEpoch, iv, ciphertext };
        const initEtag = await putConversation(envelope, null);

        // 5. Cache KEK + set session
        try {
          await cacheKek(kek, blob.keyEpoch);
        } catch {
          if (!get().indexedDbWarningShown) {
            notifyIndexedDbUnavailable();
            set({ indexedDbWarningShown: true });
          }
        }

        // Activate the KEK we already have — no re-derivation needed
        await activateKek(kek, blob.keyEpoch);

        set({
          keyBlob: blob,
          keyStatus: 'ready',
          conversation: emptyCov,
          _conversationEtag: initEtag,
        });

        notifyAiKeySetup();
      },

      // ------------------------------------------------------------------
      // Unlock (new device with blob but no KEK cache)
      // ------------------------------------------------------------------
      unlock: async (passphrase) => {
        const { keyBlob } = get();
        if (!keyBlob) throw new AiError('NO_KEY', 'No key blob found.');

        await unlockWithPassphrase(keyBlob, passphrase);
        set({ keyStatus: 'ready' });

        // Load conversation now that we can decrypt
        await get().loadConversationFromCloud();
      },

      // ------------------------------------------------------------------
      // Change passphrase (re-wrap key + chat, same keyEpoch)
      // ------------------------------------------------------------------
      changePassphrase: async (oldP, newP) => {
        const { keyBlob, conversation } = get();
        if (!keyBlob) throw new AiError('NO_KEY', 'No key blob found.');

        const newBlob = await reEncryptKeyWithNewPassphrase(keyBlob, oldP, newP);

        // Re-encrypt the conversation under new KEK (now set as session by reEncryptKeyWithNewPassphrase)
        const newEnvelope = await encryptConversation(conversation);

        await putKeyBlob(newBlob);
        const cpEtag = await putConversation(newEnvelope, undefined);

        set({ keyBlob: newBlob, _conversationEtag: cpEtag });
        notifyAiPassphraseChanged();
      },

      // ------------------------------------------------------------------
      // Remove key (full revocation)
      // ------------------------------------------------------------------
      removeKey: async () => {
        await deleteKeyBlob();
        await deleteConversation();
        await clearAllKekState();
        set({
          keyStatus: 'absent',
          keyBlob: null,
          conversation: emptyConversation(),
          _conversationEtag: null,
        });
        notifyAiKeyRemoved();
      },

      // ------------------------------------------------------------------
      // Forgot passphrase: re-key with new credentials → destroys old chat
      // ------------------------------------------------------------------
      forgotPassphrase: async (newKey, newPassphrase) => {
        // 1. Validate the new key first (old blob left untouched until valid)
        set({ keyStatus: 'validating' });
        const valid = await aiProvider.validateKey(newKey);
        if (!valid) {
          set({ keyStatus: 'locked' });
          throw new AiError('INVALID_KEY', 'Your API key was rejected by Gemini. Check the key and try again.');
        }

        // 2. New epoch + encrypt
        const { blob: partial, kek } = await encryptNewKey(newKey, newPassphrase);
        const now = new Date().toISOString();
        const blob: KeyBlob = {
          ...partial,
          providerId: 'gemini',
          createdAt: now,
          updatedAt: now,
        };

        // 3. Overwrite blob
        await putKeyBlob(blob);

        // 4. Write fresh empty chat under new epoch — unconditional (destroying old epoch)
        const emptyCov = emptyConversation();
        const { iv, ciphertext } = await aesGcmEncrypt(kek, JSON.stringify(emptyCov));
        const envelope: EncryptedEnvelope = { v: 1, keyEpoch: blob.keyEpoch, iv, ciphertext };
        const fpEtag = await putConversation(envelope, undefined);

        // 5. Cache new KEK
        try {
          await cacheKek(kek, blob.keyEpoch);
        } catch {
          if (!get().indexedDbWarningShown) {
            notifyIndexedDbUnavailable();
            set({ indexedDbWarningShown: true });
          }
        }

        // Activate the KEK we already have — no re-derivation needed
        await activateKek(kek, blob.keyEpoch);

        set({
          keyBlob: blob,
          keyStatus: 'ready',
          conversation: emptyCov,
          _conversationEtag: fpEtag,
        });
      },

      // ------------------------------------------------------------------
      // Load + decrypt conversation from S3 (called on unlock)
      // ------------------------------------------------------------------
      loadConversationFromCloud: async () => {
        const { keyBlob } = get();
        if (!keyBlob) return;

        try {
          const { envelope, etag } = await getConversation();

          if (!envelope) {
            // No chat yet — start fresh
            set({ conversation: emptyConversation(), _conversationEtag: null });
            return;
          }

          const result = await decryptConversation(envelope, keyBlob.keyEpoch);

          if (result === 'epoch_mismatch') {
            // Chat belongs to a dead epoch — start fresh silently
            set({ conversation: emptyConversation(), _conversationEtag: null });
            return;
          }

          if (result === 'decrypt_error') {
            // Same epoch but decryption failed — surface CHAT_DECRYPT
            // aiStore surfaces this via keyStatus or a special flag
            // For now, keep status ready and surface error via a message
            const errMsg: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              text: "Couldn't load your chat history — the data may be corrupt.",
              createdAt: new Date().toISOString(),
              error: { kind: 'CHAT_DECRYPT' as AiErrorKind, message: "Couldn't decrypt chat history." },
            };
            set({ conversation: { ...emptyConversation(), messages: [errMsg] }, _conversationEtag: etag });
            return;
          }

          set({ conversation: result, _conversationEtag: etag });
        } catch {
          // S3 load failed — non-fatal. Keep empty conversation.
          notifyAiCloudSyncFailed();
        }
      },

      // ------------------------------------------------------------------
      // Send a message
      // ------------------------------------------------------------------
      send: async (text) => {
        const { keyBlob, keyStatus, conversation, sending } = get();
        if (sending) return;
        if (keyStatus !== 'ready' || !keyBlob) return;

        // Get plaintext key
        let apiKey: string;
        try {
          apiKey = await revealKey(keyBlob);
        } catch (err) {
          const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
          const message = err instanceof AiError ? err.message : 'Could not unlock key.';
          const errMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: message,
            createdAt: new Date().toISOString(),
            error: { kind, message },
          };
          set({ conversation: { ...conversation, messages: [...conversation.messages, errMsg] } });
          return;
        }

        // Append user message
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
        };

        // Placeholder for assistant streaming
        const assistantMsgId = crypto.randomUUID();
        const assistantPlaceholder: Message = {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          createdAt: new Date().toISOString(),
          streaming: true,
        };

        const updatedWithUser = {
          ...conversation,
          messages: [...conversation.messages, userMsg, assistantPlaceholder],
          updatedAt: new Date().toISOString(),
        };
        set({ conversation: updatedWithUser, sending: true });

        // Build the context block (cached by plan identity — see getContextBlock)
        const plannerState = usePlannerStore.getState();
        let contextBlock: string;
        let contextEpoch: string;
        try {
          const ctx = getContextBlock(
            // Effective config (= base + active scenario) so the pack's accounts,
            // instruments and horizon match exactly what the simulation ran on.
            plannerState.config,
            plannerState.overrides,
            plannerState.baselineAccountIds,
            plannerState.baseConfig,
          );
          contextBlock = ctx.block;
          contextEpoch = ctx.epoch;
        } catch {
          const errMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            text: "Build or load a plan first so I have a forecast to explain.",
            createdAt: new Date().toISOString(),
            streaming: false,
            error: { kind: 'NO_CONTEXT', message: 'No simulation context available.' },
          };
          set({
            conversation: {
              ...updatedWithUser,
              messages: updatedWithUser.messages.map((m) =>
                m.id === assistantMsgId ? errMsg : m,
              ),
            },
            sending: false,
          });
          return;
        }

        // Build history for request
        const history = pruneHistoryTokens(
          buildHistoryForRequest({ ...conversation, messages: conversation.messages }),
          MAX_HISTORY_TOKENS,
        );

        // Stream the response, cancellable via stopStreaming() / panel close.
        const controller = new AbortController();
        _abortController = controller;
        let accumulated = '';
        let errorOccurred: { kind: AiErrorKind; message: string } | null = null;
        let aborted = false;

        try {
          for await (const chunk of aiProvider.complete(
            {
              systemPrompt: SYSTEM_PROMPT,
              contextBlock,
              history,
              userMessage: text,
            },
            apiKey,
            controller.signal,
          )) {
            accumulated += chunk.textDelta;

            // Update the streaming message in real time
            set((state) => ({
              conversation: {
                ...state.conversation,
                messages: state.conversation.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, text: accumulated } : m,
                ),
              },
            }));
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') {
            aborted = true; // user stopped — keep whatever streamed, no error
          } else {
            const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
            const message =
              err instanceof AiError
                ? err.message
                : "I didn't get a complete answer — please retry.";
            errorOccurred = { kind, message };
          }
        } finally {
          if (_abortController === controller) _abortController = null;
        }

        // Finalize: stamp the context epoch on the conversation so it persists.
        const cur = get().conversation;
        let finalConversation: Conversation;
        if (aborted && !accumulated) {
          // Stopped before any text — drop the empty placeholder, keep the user turn.
          finalConversation = {
            ...cur,
            contextEpochId: contextEpoch,
            messages: cur.messages.filter((m) => m.id !== assistantMsgId),
            updatedAt: new Date().toISOString(),
          };
        } else {
          const finalMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            text: accumulated || (errorOccurred?.message ?? "I didn't get a complete answer — please retry."),
            createdAt: new Date().toISOString(),
            streaming: false,
            error: errorOccurred ?? undefined,
          };
          finalConversation = {
            ...cur,
            contextEpochId: contextEpoch,
            messages: cur.messages.map((m) => (m.id === assistantMsgId ? finalMsg : m)),
            updatedAt: new Date().toISOString(),
          };
        }

        set({ conversation: finalConversation, sending: false });

        // Compact if needed (skip after an abort — nothing new to summarise)
        if (!aborted && shouldCompact(finalConversation.messages, finalConversation.summary)) {
          try {
            const compacted = await compactConversation(finalConversation, aiProvider, apiKey);
            set({ conversation: compacted });
            notifyAiChatCompacted();
          } catch {
            // Non-fatal: keep the uncompacted conversation
          }
        }

        // Debounced encrypted cloud write-back. The write re-encrypts via the
        // session KEK and never needs the plaintext key, so it isn't passed in —
        // the decrypted key isn't retained beyond this provider call.
        scheduleWrite(get, set);
      },

      // ------------------------------------------------------------------
      // Phase 2: propose a structured change (explicit "Suggest a change")
      // ------------------------------------------------------------------
      proposeAction: async (text) => {
        const { keyBlob, keyStatus, conversation, sending } = get();
        if (sending) return;
        if (keyStatus !== 'ready' || !keyBlob) return;

        let apiKey: string;
        try {
          apiKey = await revealKey(keyBlob);
        } catch (err) {
          const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
          const message = err instanceof AiError ? err.message : 'Could not unlock key.';
          appendAssistant(set, get, { text: message, error: { kind, message } });
          return;
        }

        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
        };
        set({
          conversation: { ...conversation, messages: [...conversation.messages, userMsg], updatedAt: new Date().toISOString() },
          sending: true,
        });

        // Build the grounded context block + the validation context (window + names).
        const plannerState = usePlannerStore.getState();
        let contextBlock: string;
        let contextEpoch: string;
        try {
          const ctx = getContextBlock(plannerState.config, plannerState.overrides, plannerState.baselineAccountIds, plannerState.baseConfig);
          contextBlock = ctx.block;
          contextEpoch = ctx.epoch;
        } catch {
          appendAssistant(set, get, {
            text: 'Build or load a plan first so I have a forecast to work with.',
            error: { kind: 'NO_CONTEXT', message: 'No simulation context available.' },
          });
          set({ sending: false });
          return;
        }

        // Build history from the PRE-append snapshot (the `conversation` captured at the
        // top of this method, before the user message was added to the store). Building it
        // from get().conversation would include the just-added user turn AND we also pass
        // it as `userMessage` below — duplicating it into two consecutive user turns, which
        // breaks Gemini's required user/model alternation. This mirrors send().
        const history = pruneHistoryTokens(buildHistoryForRequest(conversation), MAX_HISTORY_TOKENS);

        const controller = new AbortController();
        _abortController = controller;

        let invalidMessage = "I couldn't form a valid suggestion. Try rephrasing what you'd like to change.";
        try {
          const result = await aiProvider.proposeAction(
            {
              systemPrompt: `${SYSTEM_PROMPT}\n\n${ACTION_CONTRACT}`,
              contextBlock,
              history,
              userMessage: text,
              expectAction: true,
            },
            apiKey,
            controller.signal,
          );

          // The model may decline to pick one change when several were asked for, or
          // ask for a missing detail. When it clarifies an FD/RD/deposit/withdrawal/new
          // account it can attach an affordability hint (value + month) so we can warn
          // early that it won't fit — advisory only; the real gate is on the final action.
          const clarify = extractClarify(result.proposedActionJson);
          if (clarify) {
            const warning = affordabilityWarning(extractAffordability(result.proposedActionJson));
            appendAssistant(set, get, { text: warning ? `${warning}\n\n${clarify}` : clarify }, contextEpoch);
            return;
          }

          const validation = validateAction(result.proposedActionJson, {
            startMonth: plannerState.config.forecast.startMonth,
            totalMonths: plannerState.config.forecast.totalMonths,
            accountNames: plannerState.config.investments.accounts.map((a) => a.name),
            // Same order as the context pack's scenarioChanges, so a 1-based ref resolves.
            scenarioEventIds: (plannerState.overrides.runtimeEvents ?? []).map((e) => e.id),
          });

          if (validation.ok) {
            appendAssistant(set, get, {
              text: `Here's a change you can apply:\n\n**${describeAction(validation.action)}**`,
              proposedAction: validation.action,
              actionStatus: 'pending',
            }, contextEpoch);
          } else {
            invalidMessage = validation.message;
            appendAssistant(set, get, {
              text: invalidMessage,
              error: { kind: 'INVALID_ACTION', message: invalidMessage },
            }, contextEpoch);
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') {
            // user cancelled — leave just the user turn
          } else {
            const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
            const message = err instanceof AiError ? err.message : invalidMessage;
            appendAssistant(set, get, { text: message, error: { kind, message } }, contextEpoch);
          }
        } finally {
          if (_abortController === controller) _abortController = null;
          set({ sending: false });
        }

        scheduleWrite(get, set);
      },

      // ------------------------------------------------------------------
      // Phase 2: apply a proposed action (the user's explicit click).
      // applyAction is keyed by the message id and is idempotent: if the plan already
      // carries this proposal's change it no-ops, so a stale Apply (e.g. on a second
      // device) can never double-apply. "applied" is then derived from the plan — we
      // store nothing on success beyond clearing a prior failure note.
      // ------------------------------------------------------------------
      applyProposedAction: (messageId) => {
        const msg = get().conversation.messages.find((m) => m.id === messageId);
        if (!msg?.proposedAction || msg.actionStatus === 'dismissed') return;

        const result = applyAction(msg.proposedAction, messageId);
        if (result.ok) {
          notifyAiActionApplied();
          // Clear any stale failure note; the "applied" badge itself is derived.
          if (msg.actionStatus === 'failed' || msg.actionError) {
            updateMessage(set, get, messageId, { actionStatus: undefined, actionError: undefined });
            scheduleWrite(get, set);
          }
        } else {
          updateMessage(set, get, messageId, { actionStatus: 'failed', actionError: result.message });
          scheduleWrite(get, set);
        }
      },

      // ------------------------------------------------------------------
      // Phase 2: dismiss a pending proposal (nothing changes)
      // ------------------------------------------------------------------
      dismissProposedAction: (messageId) => {
        const msg = get().conversation.messages.find((m) => m.id === messageId);
        if (!msg?.proposedAction) return;
        updateMessage(set, get, messageId, { actionStatus: 'dismissed' });
        scheduleWrite(get, set);
      },

      // ------------------------------------------------------------------
      // Stop an in-flight stream (Stop button / panel close)
      // ------------------------------------------------------------------
      stopStreaming: () => {
        _abortController?.abort();
      },

      // ------------------------------------------------------------------
      // Clear chat (write fresh empty conversation to S3)
      // ------------------------------------------------------------------
      clearChat: async () => {
        const emptyCov = emptyConversation();
        set({ conversation: emptyCov });
        try {
          const envelope = await encryptConversation(emptyCov);
          const clearEtag = await putConversation(envelope, undefined);
          set({ _conversationEtag: clearEtag });
        } catch {
          notifyAiCloudSyncFailed();
        }
      },

      // ------------------------------------------------------------------
      // Reload chat from S3
      // ------------------------------------------------------------------
      reloadChat: async () => {
        await get().loadConversationFromCloud();
      },

      acknowledgeDisclosure: () => {
        set((state) => ({ settings: { ...state.settings, disclosureAcknowledged: true } }));
      },

      // ------------------------------------------------------------------
      // Sign-out: wipe local state only; S3 stays encrypted
      // ------------------------------------------------------------------
      clearForSignOut: () => {
        // Abort any in-flight stream and cancel the pending cloud write so neither
        // can fire post-sign-out (when the session KEK is gone) and surface a
        // spurious error. Also drop the context cache (it belongs to this user).
        _abortController?.abort();
        _abortController = null;
        if (_writeDebounce) {
          clearTimeout(_writeDebounce);
          _writeDebounce = null;
        }
        _ctxCache = null;
        clearSessionKek();
        clearKek().catch(() => {});
        set({
          keyStatus: 'absent',
          keyBlob: null,
          conversation: emptyConversation(),
          _conversationEtag: null,
          sending: false,
        });
      },
    }),
    {
      name: 'worth-flow-ai-v1',
      partialize: aiPersistPartialize,
    },
  ),
);

// Exactly what gets written to localStorage. Only non-secret settings — NEVER the
// conversation, key blob, KEK, passphrase, or keyStatus. Exported so a test can lock
// this allow-list against accidental regression (a leaked secret here is critical).
export function aiPersistPartialize(state: AiStore): {
  settings: AiSettings;
  indexedDbWarningShown: boolean;
} {
  return {
    settings: state.settings,
    indexedDbWarningShown: state.indexedDbWarningShown,
  };
}

// ---------------------------------------------------------------------------
// Debounced cloud write helper (outside the store to avoid re-creating on each render)
// ---------------------------------------------------------------------------

// Cross-device merge: keep all remote messages, append any local messages whose ids
// aren't already in remote (dedupe by id). Exported so the concurrency behaviour can
// be locked by a test without driving the debounced S3 path.
export function mergeConversations(remote: Conversation, local: Conversation): Conversation {
  const remoteIds = new Set(remote.messages.map((m) => m.id));
  const newLocal = local.messages.filter((m) => !remoteIds.has(m.id));
  return {
    ...remote,
    messages: [...remote.messages, ...newLocal],
    updatedAt: new Date().toISOString(),
  };
}

// Detect the model's "I can only do one change — which first?" reply. Returns the
// clarification text, or null if the JSON isn't a clarify object.
function extractClarify(json: unknown): string | null {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const c = (json as { clarify?: unknown }).clarify;
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

// The optional { kind, amount, month, accountName? } hint a clarify reply may carry, so
// affordability can be pre-flagged before all fields are collected (see affordabilityWarning).
function extractAffordability(json: unknown): unknown {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    return (json as { affordability?: unknown }).affordability ?? null;
  }
  return null;
}

// Append a new assistant message (optionally stamping the context epoch).
function appendAssistant(
  set: (partial: Partial<AiStore>) => void,
  get: () => AiStore,
  fields: Partial<Message> & { text: string },
  contextEpochId?: string,
) {
  const conv = get().conversation;
  const msg: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    createdAt: new Date().toISOString(),
    ...fields,
  };
  set({
    conversation: {
      ...conv,
      messages: [...conv.messages, msg],
      ...(contextEpochId ? { contextEpochId } : {}),
      updatedAt: new Date().toISOString(),
    },
  });
}

// Patch a single message in place by id.
function updateMessage(
  set: (partial: Partial<AiStore>) => void,
  get: () => AiStore,
  messageId: string,
  changes: Partial<Message>,
) {
  const conv = get().conversation;
  set({
    conversation: {
      ...conv,
      messages: conv.messages.map((m) => (m.id === messageId ? { ...m, ...changes } : m)),
      updatedAt: new Date().toISOString(),
    },
  });
}

let _writeDebounce: ReturnType<typeof setTimeout> | null = null;

function scheduleWrite(
  get: () => AiStore,
  set: (partial: Partial<AiStore>) => void,
) {
  if (_writeDebounce) clearTimeout(_writeDebounce);
  _writeDebounce = setTimeout(async () => {
    const { conversation, _conversationEtag, keyBlob } = get();
    if (!keyBlob) return;
    try {
      const envelope = await encryptConversation(conversation);
      // Conditional update when we have an etag; unconditional fallback when we don't
      // (never null/create-only here — the object already exists after setup)
      const newEtag = await putConversation(envelope, _conversationEtag ?? undefined);
      set({ _conversationEtag: newEtag });
    } catch (err) {
      if (isPreconditionFailed(err)) {
        // Genuine concurrent write from another device: re-fetch, merge, retry
        try {
          const { envelope: remoteEnv, etag: remoteEtag } = await getConversation();
          if (!remoteEnv || !keyBlob) return;
          const remote = await decryptConversation(remoteEnv, keyBlob.keyEpoch);
          if (remote === 'epoch_mismatch' || remote === 'decrypt_error') return;

          // Merge: keep remote messages, append any local messages not yet in remote
          const merged = mergeConversations(remote, get().conversation);
          const mergedEnvelope = await encryptConversation(merged);
          const mergedEtag = await putConversation(mergedEnvelope, remoteEtag);
          set({ conversation: merged, _conversationEtag: mergedEtag ?? remoteEtag });
        } catch {
          notifyAiCloudSyncFailed();
        }
      } else {
        notifyAiCloudSyncFailed();
      }
    }
  }, 1500);
}
