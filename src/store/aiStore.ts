import type { Conversation, Message } from '@/ai/chat/conversation.types';
import type { KeyBlob, EncryptedEnvelope } from '@/ai/cloud/aiCloud';
import type { KeyStatus } from '@/ai/keyVault/keyVault';
import type { AiErrorKind, ProviderId } from '@/ai/provider/types';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { applyAction } from '@/ai/actions/applyAction';
import { affordabilityWarning } from '@/ai/actions/checkFeasibility';
import { describeAction } from '@/ai/actions/describeAction';
import { validateAction } from '@/ai/actions/validateAction';
import {
  notifyAiCloudSyncFailed,
  notifyAiKeyRemoved,
  notifyAiKeySetup,
  notifyAiPassphraseChanged,
  notifyIndexedDbUnavailable,
  notifyAiChatCompacted,
  notifyAiActionApplied,
} from '@/ai/aiNotifications';
import { compactConversation, buildHistoryForRequest, pruneHistoryTokens } from '@/ai/chat/compaction';
import { emptyConversation } from '@/ai/chat/conversation.types';
import {
  encryptConversation,
  decryptConversation,
  scheduleConversationWrite,
  flushConversationWrite,
  cancelConversationWrite,
} from '@/ai/chat/conversationSync';
import { shouldCompact, MAX_HISTORY_TOKENS } from '@/ai/chat/tokenBudget';
import {
  getKeyBlob,
  putKeyBlob,
  deleteKeyBlob,
  getConversation,
  putConversation,
  deleteConversation,
} from '@/ai/cloud/aiCloud';
import { SYSTEM_PROMPT, ACTION_CONTRACT } from '@/ai/config';
import { getContextBlock, clearContextCache } from '@/ai/context/contextCache';
import { aesGcmEncrypt } from '@/ai/keyVault/crypto';
import { cacheKek, clearKek } from '@/ai/keyVault/kekCache';
import {
  resolveKeyStatus,
  unlockWithPassphrase,
  revealKey,
  encryptNewKey,
  reEncryptKeyWithNewPassphrase,
  clearAllKekState,
  clearSessionKek,
  getSessionKek,
  activateKek,
} from '@/ai/keyVault/keyVault';
import { getProvider } from '@/ai/provider/index';
import { getDefaultModelId, DEFAULT_PROVIDER, PROVIDER_LABELS } from '@/ai/provider/modelCatalog';
import { AiError, isAbortError } from '@/ai/provider/types';
import { usePlannerStore } from '@/store/plannerStore';

export { mergeConversations } from '@/ai/chat/conversationSync';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AiSettings {
  disclosureAcknowledged: boolean;
}

interface AiStore {
  conversation: Conversation;
  keyStatus: KeyStatus;
  keyBlob: KeyBlob | null;
  settings: AiSettings;
  sending: boolean;
  indexedDbWarningShown: boolean;

  _conversationEtag: string | null;

  initAi: () => Promise<void>;
  setupKey(plaintextApiKey: string, passphrase: string, providerId?: ProviderId, modelId?: string): Promise<void>;
  unlock(passphrase: string): Promise<void>;
  changePassphrase(oldP: string, newP: string): Promise<void>;
  removeKey(): Promise<void>;
  forgotPassphrase(newKey: string, newPassphrase: string, providerId?: ProviderId, modelId?: string): Promise<void>;

  loadConversationFromCloud(): Promise<void>;
  send(text: string): Promise<void>;
  stopStreaming(): void;
  clearChat(): Promise<void>;
  reloadChat(): Promise<void>;
  acknowledgeDisclosure(): void;
  clearForSignOut(): void;

  proposeAction(text: string): Promise<void>;
  applyProposedAction(messageId: string): void;
  dismissProposedAction(messageId: string): void;
}

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
            // KEK is in cache - auto-unlock and load chat
            await get().loadConversationFromCloud();
          }
        } catch {
          notifyAiCloudSyncFailed();
        }
      },

      // ------------------------------------------------------------------
      // Setup
      // ------------------------------------------------------------------
      setupKey: async (plaintextApiKey, passphrase, providerId = DEFAULT_PROVIDER, modelId) => {
        set({ keyStatus: 'validating' });
        try {
          await mintKeyAndResetChat(set, get, plaintextApiKey, passphrase, providerId, modelId ?? getDefaultModelId(providerId));
          notifyAiKeySetup();
        } catch (err) {
          set({ keyStatus: 'absent' });
          throw err instanceof AiError
            ? err
            : new AiError('CLOUD_SYNC', "Couldn't save your encrypted key to the cloud. Check your connection and try again.");
        }
      },

      // ------------------------------------------------------------------
      // Unlock
      // ------------------------------------------------------------------
      unlock: async (passphrase) => {
        const { keyBlob } = get();
        if (!keyBlob) throw new AiError('NO_KEY', 'No key blob found.');

        await unlockWithPassphrase(keyBlob, passphrase);
        set({ keyStatus: 'ready' });

        const session = getSessionKek();
        if (session) {
          try {
            await cacheKek(session.kek, session.epoch);
          } catch {
            if (!get().indexedDbWarningShown) {
              notifyIndexedDbUnavailable();
              set({ indexedDbWarningShown: true });
            }
          }
        }

        await get().loadConversationFromCloud();
      },

      // ------------------------------------------------------------------
      // Change passphrase
      // ------------------------------------------------------------------
      changePassphrase: async (oldP, newP) => {
        const { keyBlob, conversation } = get();
        if (!keyBlob) throw new AiError('NO_KEY', 'No key blob found.');

        const newBlob = await reEncryptKeyWithNewPassphrase(keyBlob, oldP, newP);

        // Re-encrypt the conversation under new KEK
        const newEnvelope = await encryptConversation(conversation);

        await putKeyBlob(newBlob);
        const cpEtag = await putConversation(newEnvelope, undefined);

        set({ keyBlob: newBlob, _conversationEtag: cpEtag });
        notifyAiPassphraseChanged();
      },

      // ------------------------------------------------------------------
      // Remove key
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
      // Forgot passphrase: destroys old chat
      // ------------------------------------------------------------------
      forgotPassphrase: async (newKey, newPassphrase, providerId = DEFAULT_PROVIDER, modelId) => {
        set({ keyStatus: 'validating' });
        try {
          await mintKeyAndResetChat(set, get, newKey, newPassphrase, providerId, modelId ?? getDefaultModelId(providerId));
        } catch (err) {
          set({ keyStatus: 'locked' });
          throw err instanceof AiError
            ? err
            : new AiError('CLOUD_SYNC', "Couldn't save your new encrypted key to the cloud. Check your connection and try again.");
        }
      },

      // ------------------------------------------------------------------
      // Load + decrypt conversation from S3
      // ------------------------------------------------------------------
      loadConversationFromCloud: async () => {
        const { keyBlob } = get();
        if (!keyBlob) return;

        try {
          const { envelope, etag } = await getConversation();

          if (!envelope) {
            set({ conversation: emptyConversation(), _conversationEtag: null });
            return;
          }

          const result = await decryptConversation(envelope, keyBlob.keyEpoch);

          if (result === 'epoch_mismatch') {
            set({ conversation: emptyConversation(), _conversationEtag: null });
            return;
          }

          if (result === 'decrypt_error') {
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

          const normalized: Conversation = {
            ...result,
            messages: result.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
          };
          set({ conversation: normalized, _conversationEtag: etag });
        } catch {
          // S3 load failed - non-fatal. Keep empty conversation.
          notifyAiCloudSyncFailed();
        }
      },

      // ------------------------------------------------------------------
      // Send a message
      // ------------------------------------------------------------------
      send: async (text) => {
        const apiKey = await claimTurnKey(set, get);
        if (apiKey === null) return;

        // keyBlob is guaranteed present once claimTurnKey succeeds (keyStatus ready).
        const blob = get().keyBlob!;
        const provider = getProvider(blob.providerId);

        const conversation = get().conversation;

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
        set({ conversation: updatedWithUser });

        // Build the context block (cached by plan identity)
        const plannerState = usePlannerStore.getState();
        let contextBlock: string;
        let contextEpoch: string;
        try {
          const ctx = getContextBlock(
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
          for await (const chunk of provider.complete(
            {
              systemPrompt: SYSTEM_PROMPT,
              contextBlock,
              history,
              userMessage: text,
              modelId: blob.modelId,
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
          if (isAbortError(err)) {
            aborted = true;
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
          // Stopped before any text - drop the empty placeholder, keep the user turn.
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

        // Compact if needed (skip after an abort - nothing new to summarise)
        if (!aborted && shouldCompact(finalConversation.messages, finalConversation.summary)) {
          try {
            const compacted = await compactConversation(finalConversation, provider, apiKey, blob.modelId);
            set({ conversation: compacted });
            notifyAiChatCompacted();
          } catch {
            // Non-fatal: keep the uncompacted conversation
          }
        }

        // Debounced encrypted cloud write-back. The write re-encrypts via the
        // session KEK and never needs the plaintext key, so it isn't passed in -
        // the decrypted key isn't retained beyond this provider call.
        scheduleConversationWrite(get, set);
      },

      proposeAction: async (text) => {
        const apiKey = await claimTurnKey(set, get);
        if (apiKey === null) return;

        const blob = get().keyBlob!;
        const provider = getProvider(blob.providerId);

        const conversation = get().conversation;

        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
        };
        set({
          conversation: { ...conversation, messages: [...conversation.messages, userMsg], updatedAt: new Date().toISOString() },
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
        // it as `userMessage` below - duplicating it into two consecutive user turns, which
        // breaks Gemini's required user/model alternation. This mirrors send().
        const history = pruneHistoryTokens(buildHistoryForRequest(conversation), MAX_HISTORY_TOKENS);

        const controller = new AbortController();
        _abortController = controller;

        let invalidMessage = "I couldn't form a valid suggestion. Try rephrasing what you'd like to change.";
        try {
          const result = await provider.proposeAction(
            {
              systemPrompt: `${SYSTEM_PROMPT}\n\n${ACTION_CONTRACT}`,
              contextBlock,
              history,
              userMessage: text,
              modelId: blob.modelId,
            },
            apiKey,
            controller.signal,
          );

          // The model may decline to pick one change when several were asked for, or
          // ask for a missing detail. When it clarifies an FD/RD/deposit/withdrawal/new
          // account it can attach an affordability hint (value + month) so we can warn
          // early that it won't fit - advisory only; the real gate is on the final action.
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
          if (isAbortError(err)) {
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

        scheduleConversationWrite(get, set);
      },

      applyProposedAction: (messageId) => {
        const msg = get().conversation.messages.find((m) => m.id === messageId);
        if (!msg?.proposedAction || msg.actionStatus === 'dismissed') return;

        const result = applyAction(msg.proposedAction, messageId);
        if (result.ok) {
          notifyAiActionApplied();
          // Clear any stale failure note; the "applied" badge itself is derived.
          if (msg.actionStatus === 'failed' || msg.actionError) {
            updateMessage(set, get, messageId, { actionStatus: undefined, actionError: undefined });
            scheduleConversationWrite(get, set);
          }
        } else {
          updateMessage(set, get, messageId, { actionStatus: 'failed', actionError: result.message });
          scheduleConversationWrite(get, set);
        }
      },

      dismissProposedAction: (messageId) => {
        const msg = get().conversation.messages.find((m) => m.id === messageId);
        if (!msg?.proposedAction) return;
        updateMessage(set, get, messageId, { actionStatus: 'dismissed' });
        scheduleConversationWrite(get, set);
      },

      // ------------------------------------------------------------------
      // Stop an in-flight stream
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
        _abortController?.abort();
        _abortController = null;
        cancelConversationWrite();
        clearContextCache();
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
// Store-level helpers
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<AiStore> | ((state: AiStore) => Partial<AiStore>)) => void;
type GetFn = () => AiStore;

// Shared by setupKey/forgotPassphrase: validate the key, encrypt it under a fresh
// epoch, upload blob + empty chat, cache/activate the KEK, and set the store ready.
// Throws on any failure; callers translate that into their fallback status.
async function mintKeyAndResetChat(
  set: SetFn,
  get: GetFn,
  plaintextApiKey: string,
  passphrase: string,
  providerId: ProviderId,
  modelId: string,
): Promise<void> {
  // If the user is switching to a different provider, the disclosure (where the
  // forecast data now goes) must be re-shown before first use.
  const providerChanged = get().keyBlob?.providerId !== providerId;

  const valid = await getProvider(providerId).validateKey(plaintextApiKey, modelId);
  if (!valid) {
    throw new AiError('INVALID_KEY', `Your API key was rejected by ${PROVIDER_LABELS[providerId]}. Check the key and try again.`);
  }

  const { blob: partial, kek } = await encryptNewKey(plaintextApiKey, passphrase);
  const now = new Date().toISOString();
  const blob: KeyBlob = { ...partial, providerId, modelId, createdAt: now, updatedAt: now };

  await putKeyBlob(blob);

  // Unconditional write: a create-only put can 412 forever against a stale object,
  // and the new epoch makes any old envelope unreadable anyway.
  const emptyCov = emptyConversation();
  const { iv, ciphertext } = await aesGcmEncrypt(kek, JSON.stringify(emptyCov));
  const envelope: EncryptedEnvelope = { v: 1, keyEpoch: blob.keyEpoch, iv, ciphertext };
  const etag = await putConversation(envelope, undefined);

  try {
    await cacheKek(kek, blob.keyEpoch);
  } catch {
    if (!get().indexedDbWarningShown) {
      notifyIndexedDbUnavailable();
      set({ indexedDbWarningShown: true });
    }
  }

  await activateKek(kek, blob.keyEpoch);

  set({
    keyBlob: blob,
    keyStatus: 'ready',
    conversation: emptyCov,
    _conversationEtag: etag,
    ...(providerChanged
      ? { settings: { ...get().settings, disclosureAcknowledged: false } }
      : {}),
  });
}

// Shared prologue of send/proposeAction: claim the `sending` flag BEFORE the first
// await (a later claim left a window where a second Enter passed the guard and sent
// the same turn twice), then decrypt the API key. Returns null when the turn can't
// start — with any error already surfaced in-chat and `sending` released.
async function claimTurnKey(set: SetFn, get: GetFn): Promise<string | null> {
  const { keyBlob, keyStatus, sending } = get();
  if (sending) return null;
  if (keyStatus !== 'ready' || !keyBlob) return null;
  set({ sending: true });
  try {
    return await revealKey(keyBlob);
  } catch (err) {
    const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
    const message = err instanceof AiError ? err.message : 'Could not unlock key.';
    appendAssistant(set, get, { text: message, error: { kind, message } });
    set({ sending: false });
    return null;
  }
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

if (typeof document !== 'undefined') {
  const flush = () => flushConversationWrite(useAiStore.getState, useAiStore.setState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
