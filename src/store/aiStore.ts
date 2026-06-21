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
import { SYSTEM_PROMPT } from '@/ai/config';

import {
  notifyAiCloudSyncFailed,
  notifyAiKeyRemoved,
  notifyAiKeySetup,
  notifyAiPassphraseChanged,
  notifyIndexedDbUnavailable,
  notifyAiChatCompacted,
} from '@/ai/aiNotifications';

import { usePlannerStore } from '@/store/plannerStore';
import { simulate } from '@/engine/simulate';
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

  // Pending write timer handle
  _writeTimer: ReturnType<typeof setTimeout> | null;

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
  clearChat(): Promise<void>;
  reloadChat(): Promise<void>;
  acknowledgeDisclosure(): void;
  clearForSignOut(): void;
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
      _writeTimer: null,

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

        // 4. Write empty encrypted conversation (same epoch)
        const emptyCov = emptyConversation();
        const { iv, ciphertext } = await aesGcmEncrypt(kek, JSON.stringify(emptyCov));
        const envelope: EncryptedEnvelope = { v: 1, keyEpoch: blob.keyEpoch, iv, ciphertext };
        await putConversation(envelope, null);

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
          _conversationEtag: null,
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
        await putConversation(newEnvelope, undefined);

        set({ keyBlob: newBlob });
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

        // 4. Write fresh empty chat under new epoch
        const emptyCov = emptyConversation();
        const { iv, ciphertext } = await aesGcmEncrypt(kek, JSON.stringify(emptyCov));
        const envelope: EncryptedEnvelope = { v: 1, keyEpoch: blob.keyEpoch, iv, ciphertext };
        await putConversation(envelope, undefined);

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
          _conversationEtag: null,
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

        // Build context pack from live simulation
        const plannerState = usePlannerStore.getState();
        let contextBlock: string;
        try {
          const result = simulate(plannerState.config, plannerState.overrides);
          const pack = buildContextPack(
            result,
            plannerState.baseConfig,
            plannerState.overrides,
            plannerState.baselineAccountIds,
          );
          contextBlock = serializeContextPack(pack);
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

        // Stream the response
        let accumulated = '';
        let errorOccurred: { kind: AiErrorKind; message: string } | null = null;

        try {
          for await (const chunk of aiProvider.complete(
            {
              systemPrompt: SYSTEM_PROMPT,
              contextBlock,
              history,
              userMessage: text,
            },
            apiKey,
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
          const kind = err instanceof AiError ? err.kind : 'UNKNOWN';
          const message =
            err instanceof AiError
              ? err.message
              : "I didn't get a complete answer — please retry.";
          errorOccurred = { kind, message };
        }

        // Finalize the assistant message
        const finalMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          text: accumulated || (errorOccurred?.message ?? "I didn't get a complete answer — please retry."),
          createdAt: new Date().toISOString(),
          streaming: false,
          error: errorOccurred ?? undefined,
        };

        const finalConversation: Conversation = {
          ...get().conversation,
          messages: get().conversation.messages.map((m) =>
            m.id === assistantMsgId ? finalMsg : m,
          ),
          updatedAt: new Date().toISOString(),
        };

        set({ conversation: finalConversation, sending: false });

        // Compact if needed
        if (shouldCompact(finalConversation.messages, finalConversation.summary)) {
          try {
            const compacted = await compactConversation(finalConversation, aiProvider, apiKey);
            set({ conversation: compacted });
            notifyAiChatCompacted();
          } catch {
            // Non-fatal: keep the uncompacted conversation
          }
        }

        // Debounced encrypted cloud write-back
        scheduleWrite(get, set, apiKey);
      },

      // ------------------------------------------------------------------
      // Clear chat (write fresh empty conversation to S3)
      // ------------------------------------------------------------------
      clearChat: async () => {
        const emptyCov = emptyConversation();
        set({ conversation: emptyCov });
        try {
          const envelope = await encryptConversation(emptyCov);
          await putConversation(envelope, undefined);
          set({ _conversationEtag: null });
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
      // Only persist non-secret settings. Never persist the conversation,
      // the key blob, the KEK, passphrase, or keyStatus to localStorage.
      partialize: (state) => ({
        settings: state.settings,
        indexedDbWarningShown: state.indexedDbWarningShown,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Debounced cloud write helper (outside the store to avoid re-creating on each render)
// ---------------------------------------------------------------------------

let _writeDebounce: ReturnType<typeof setTimeout> | null = null;

function scheduleWrite(
  get: () => AiStore,
  set: (partial: Partial<AiStore>) => void,
  apiKey: string,
) {
  if (_writeDebounce) clearTimeout(_writeDebounce);
  _writeDebounce = setTimeout(async () => {
    const { conversation, _conversationEtag, keyBlob } = get();
    if (!keyBlob) return;
    try {
      const envelope = await encryptConversation(conversation);
      // Use the current ETag for conditional write
      await putConversation(envelope, _conversationEtag ?? null);
    } catch (err) {
      if (isPreconditionFailed(err)) {
        // Concurrent write from another device: re-fetch, merge, retry
        try {
          const { envelope: remoteEnv, etag: remoteEtag } = await getConversation();
          if (!remoteEnv || !keyBlob) return;
          const remote = await decryptConversation(remoteEnv, keyBlob.keyEpoch);
          if (remote === 'epoch_mismatch' || remote === 'decrypt_error') return;

          // Merge: keep remote messages, append any local messages added after the base
          const { conversation: currentConv } = get();
          const remoteIds = new Set(remote.messages.map((m) => m.id));
          const newLocal = currentConv.messages.filter((m) => !remoteIds.has(m.id));
          const merged: Conversation = {
            ...remote,
            messages: [...remote.messages, ...newLocal],
            updatedAt: new Date().toISOString(),
          };

          const mergedEnvelope = await encryptConversation(merged);
          await putConversation(mergedEnvelope, remoteEtag);
          set({ conversation: merged, _conversationEtag: remoteEtag });
        } catch {
          notifyAiCloudSyncFailed();
        }
      } else {
        notifyAiCloudSyncFailed();
      }
    }
    void apiKey; // included for future use (analytics, etc.)
  }, 1500);
}
