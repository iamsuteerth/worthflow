import type { Conversation } from '@/ai/chat/conversation.types';
import type { KeyBlob, EncryptedEnvelope } from '@/ai/cloud/aiCloud';

import { getConversation, putConversation } from '@/ai/cloud/aiCloud';
import { encryptWithSessionKek, decryptWithSessionKek } from '@/ai/keyVault/keyVault';
import { notifyAiCloudSyncFailed } from '@/ai/aiNotifications';

// ---------------------------------------------------------------------------
// conversationSync — encrypted, debounced, conflict-merging persistence of the
// chat to S3. Owns the module-level debounce timer; aiStore calls in.
// ---------------------------------------------------------------------------

// The slice of aiStore this module reads/writes.
export interface SyncHost {
  conversation: Conversation;
  keyBlob: KeyBlob | null;
  sending: boolean;
  _conversationEtag: string | null;
}

type Get = () => SyncHost;
type Set = (partial: Partial<SyncHost>) => void;

export const WRITE_DEBOUNCE_MS = 1500;

let _timer: ReturnType<typeof setTimeout> | null = null;

export function isPreconditionFailed(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'PreconditionFailed' || e?.$metadata?.httpStatusCode === 412;
}

export async function encryptConversation(conv: Conversation): Promise<EncryptedEnvelope> {
  const { iv, ciphertext, epoch } = await encryptWithSessionKek(JSON.stringify(conv));
  return { v: 1, keyEpoch: epoch, iv, ciphertext };
}

export async function decryptConversation(
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

// Cross-device merge: keep all remote messages, add any local messages whose ids
// aren't already in remote, then order chronologically (stable sort, so equal
// timestamps keep remote-then-local order).
export function mergeConversations(remote: Conversation, local: Conversation): Conversation {
  const remoteIds = new Set(remote.messages.map((m) => m.id));
  const newLocal = local.messages.filter((m) => !remoteIds.has(m.id));
  const messages = [...remote.messages, ...newLocal].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  return {
    ...remote,
    messages,
    updatedAt: new Date().toISOString(),
  };
}

async function writeNow(get: Get, set: Set): Promise<void> {
  const { conversation, _conversationEtag, keyBlob } = get();
  if (!keyBlob) return;
  try {
    const envelope = await encryptConversation(conversation);
    // Conditional update when we have an etag; unconditional fallback when we don't
    // (never create-only here — the object already exists after setup).
    const newEtag = await putConversation(envelope, _conversationEtag ?? undefined);
    set({ _conversationEtag: newEtag });
  } catch (err) {
    if (isPreconditionFailed(err)) {
      // Genuine concurrent write from another device: re-fetch, merge, retry.
      try {
        const { envelope: remoteEnv, etag: remoteEtag } = await getConversation();
        if (!remoteEnv) return;
        const remote = await decryptConversation(remoteEnv, keyBlob.keyEpoch);
        if (remote === 'epoch_mismatch' || remote === 'decrypt_error') return;

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
}

export function scheduleConversationWrite(get: Get, set: Set): void {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    if (get().sending) {
      // A newer turn is in flight: persisting now would write a transient
      // streaming placeholder, and the merge path could clobber the live
      // stream. Re-arm and try again once the turn settles.
      scheduleConversationWrite(get, set);
      return;
    }
    void writeNow(get, set);
  }, WRITE_DEBOUNCE_MS);
}

// Best-effort flush for pagehide/visibility-hidden: fire any pending write
// immediately instead of losing it with the tab. The browser may still kill
// in-flight async work — this narrows the loss window, it can't close it.
export function flushConversationWrite(get: Get, set: Set): void {
  if (!_timer) return;
  clearTimeout(_timer);
  _timer = null;
  void writeNow(get, set);
}

export function cancelConversationWrite(): void {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}
