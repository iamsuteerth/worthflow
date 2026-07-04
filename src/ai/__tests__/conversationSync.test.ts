import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  cloud: {
    conversation: null as unknown,
    etag: null as string | null,
    putCalls: 0,
    failNextPutWith: null as unknown,
  },
}));

vi.mock('@/ai/cloud/aiCloud', () => ({
  getConversation: async () => ({ envelope: h.cloud.conversation, etag: h.cloud.etag }),
  putConversation: async (env: unknown) => {
    if (h.cloud.failNextPutWith) {
      const e = h.cloud.failNextPutWith;
      h.cloud.failNextPutWith = null;
      throw e;
    }
    h.cloud.putCalls++;
    h.cloud.conversation = env;
    h.cloud.etag = `etag-${h.cloud.putCalls}`;
    return h.cloud.etag;
  },
}));

vi.mock('@/ai/aiNotifications', () => ({ notifyAiCloudSyncFailed: () => {} }));

import {
  mergeConversations,
  encryptConversation,
  decryptConversation,
  isPreconditionFailed,
  scheduleConversationWrite,
  flushConversationWrite,
  cancelConversationWrite,
  WRITE_DEBOUNCE_MS,
  type SyncHost,
} from '@/ai/chat/conversationSync';
import { encryptNewKey, activateKek, clearSessionKek } from '@/ai/keyVault/keyVault';
import type { Conversation, Message } from '@/ai/chat/conversation.types';
import type { KeyBlob } from '@/ai/cloud/aiCloud';

function msg(id: string, createdAt: string, text = id): Message {
  return { id, role: 'user', text, createdAt };
}

function conv(messages: Message[]): Conversation {
  return { v: 1, messages, contextEpochId: 'e', startedAt: 't0', updatedAt: 't0' };
}

async function sessionBlob(): Promise<KeyBlob> {
  const { blob, kek } = await encryptNewKey('AIzaSYNC', 'passphrase1');
  await activateKek(kek, blob.keyEpoch);
  return { ...blob, providerId: 'gemini', modelId: 'gemini-2.5-flash', createdAt: 'c', updatedAt: 'c' };
}

function makeHost(conversation: Conversation, keyBlob: KeyBlob | null) {
  const state: SyncHost = { conversation, keyBlob, sending: false, _conversationEtag: null };
  return {
    state,
    get: () => state,
    set: (p: Partial<SyncHost>) => Object.assign(state, p),
  };
}

beforeEach(() => {
  h.cloud.conversation = null;
  h.cloud.etag = null;
  h.cloud.putCalls = 0;
  h.cloud.failNextPutWith = null;
  clearSessionKek();
});

afterEach(() => {
  cancelConversationWrite();
  vi.useRealTimers();
  clearSessionKek();
});

describe('mergeConversations — chronological cross-device merge', () => {
  it('interleaves local-only messages by createdAt instead of appending at the end', () => {
    const remote = conv([msg('r1', '2026-01-01T10:00:00Z'), msg('r2', '2026-01-01T12:00:00Z')]);
    const local = conv([msg('r1', '2026-01-01T10:00:00Z'), msg('l1', '2026-01-01T11:00:00Z')]);
    expect(mergeConversations(remote, local).messages.map((x) => x.id)).toEqual(['r1', 'l1', 'r2']);
  });

  it('keeps remote-then-local order for identical timestamps (stable)', () => {
    const remote = conv([msg('r1', 'T'), msg('r2', 'T')]);
    const local = conv([msg('l1', 'T')]);
    expect(mergeConversations(remote, local).messages.map((x) => x.id)).toEqual(['r1', 'r2', 'l1']);
  });

  it('dedupes by id even when the duplicate has a different timestamp locally', () => {
    const remote = conv([msg('a', '2026-01-01T10:00:00Z')]);
    const local = conv([msg('a', '2026-01-01T11:00:00Z'), msg('b', '2026-01-01T12:00:00Z')]);
    const merged = mergeConversations(remote, local);
    expect(merged.messages.map((x) => x.id)).toEqual(['a', 'b']);
    // the remote copy of the duplicate wins
    expect(merged.messages[0].createdAt).toBe('2026-01-01T10:00:00Z');
  });

  it('handles empty sides', () => {
    expect(mergeConversations(conv([]), conv([msg('a', 't')])).messages.map((x) => x.id)).toEqual(['a']);
    expect(mergeConversations(conv([msg('a', 't')]), conv([])).messages.map((x) => x.id)).toEqual(['a']);
    expect(mergeConversations(conv([]), conv([])).messages).toEqual([]);
  });
});

describe('encrypt/decrypt round trip', () => {
  it('round-trips under the session KEK and fails closed on epoch mismatch / corruption', async () => {
    const blob = await sessionBlob();
    const c = conv([msg('a', 't', 'hello')]);
    const env = await encryptConversation(c);
    expect(env.keyEpoch).toBe(blob.keyEpoch);

    expect(await decryptConversation(env, blob.keyEpoch)).toEqual(c);
    expect(await decryptConversation(env, 'other-epoch')).toBe('epoch_mismatch');
    expect(
      await decryptConversation({ ...env, ciphertext: env.ciphertext.slice(0, -8) + 'AAAAAAAA' }, blob.keyEpoch),
    ).toBe('decrypt_error');
  });
});

describe('isPreconditionFailed', () => {
  it('matches by error name and by HTTP 412 metadata only', () => {
    expect(isPreconditionFailed({ name: 'PreconditionFailed' })).toBe(true);
    expect(isPreconditionFailed({ $metadata: { httpStatusCode: 412 } })).toBe(true);
    expect(isPreconditionFailed({ name: 'NoSuchKey' })).toBe(false);
    expect(isPreconditionFailed({ $metadata: { httpStatusCode: 500 } })).toBe(false);
    expect(isPreconditionFailed(null)).toBe(false);
    expect(isPreconditionFailed(undefined)).toBe(false);
  });
});

describe('debounced write lifecycle', () => {
  it('writes once after the debounce window and stores the new etag', async () => {
    const blob = await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), blob);

    vi.useFakeTimers();
    scheduleConversationWrite(host.get, host.set);
    scheduleConversationWrite(host.get, host.set); // re-schedule resets, still ONE write
    await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS);
    vi.useRealTimers();

    await vi.waitFor(() => expect(h.cloud.putCalls).toBe(1));
    expect(host.state._conversationEtag).toBe('etag-1');
  });

  it('defers while a turn is in flight (sending) and re-arms', async () => {
    const blob = await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), blob);
    host.state.sending = true;

    vi.useFakeTimers();
    scheduleConversationWrite(host.get, host.set);
    await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS);
    expect(h.cloud.putCalls).toBe(0); // deferred, not written

    host.state.sending = false;
    await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS);
    vi.useRealTimers();
    await vi.waitFor(() => expect(h.cloud.putCalls).toBe(1));
  });

  it('flushConversationWrite fires a pending write immediately (pagehide path)', async () => {
    const blob = await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), blob);

    scheduleConversationWrite(host.get, host.set); // pending 1.5s out
    flushConversationWrite(host.get, host.set);
    await vi.waitFor(() => expect(h.cloud.putCalls).toBe(1));
  });

  it('flush is a no-op when nothing is pending', async () => {
    const blob = await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), blob);
    flushConversationWrite(host.get, host.set);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.cloud.putCalls).toBe(0);
  });

  it('cancelConversationWrite drops the pending write', async () => {
    const blob = await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), blob);

    vi.useFakeTimers();
    scheduleConversationWrite(host.get, host.set);
    cancelConversationWrite();
    await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS * 2);
    vi.useRealTimers();
    expect(h.cloud.putCalls).toBe(0);
  });

  it('never writes without a key blob', async () => {
    await sessionBlob();
    const host = makeHost(conv([msg('a', 't')]), null);
    vi.useFakeTimers();
    scheduleConversationWrite(host.get, host.set);
    await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS);
    vi.useRealTimers();
    expect(h.cloud.putCalls).toBe(0);
  });
});

describe('412 conflict merge', () => {
  it('re-fetches, merges chronologically, and retries with the remote etag', async () => {
    const blob = await sessionBlob();

    // Remote has r1(t1) and r2(t3); local has r1 and l1(t2).
    const remote = conv([msg('r1', '2026-01-01T10:00:00Z'), msg('r2', '2026-01-01T12:00:00Z')]);
    h.cloud.conversation = await encryptConversation(remote);
    h.cloud.etag = 'remote-etag';

    const local = conv([msg('r1', '2026-01-01T10:00:00Z'), msg('l1', '2026-01-01T11:00:00Z')]);
    const host = makeHost(local, blob);
    host.state._conversationEtag = 'stale-etag';

    h.cloud.failNextPutWith = { name: 'PreconditionFailed' };
    scheduleConversationWrite(host.get, host.set);
    flushConversationWrite(host.get, host.set);

    await vi.waitFor(() => expect(h.cloud.putCalls).toBe(1));
    expect(host.state.conversation.messages.map((x) => x.id)).toEqual(['r1', 'l1', 'r2']);
    expect(host.state._conversationEtag).toBe('etag-1');
  });
});
