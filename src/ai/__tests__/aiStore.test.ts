import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// localStorage shim for zustand persist (node env). Must exist before the store
// modules are imported — vi.hoisted runs ahead of the static imports below.
vi.hoisted(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  }
});

const h = vi.hoisted(() => ({
  cloud: { keyBlob: null as unknown, conversation: null as unknown, etag: null as string | null },
  provider: {
    id: 'mock' as const,
    validateKey: async (k: string) => k.startsWith('AIza'),
    complete: async function* () {
      yield { textDelta: 'Hello' };
      yield { textDelta: ' there' };
    },
  },
}));

vi.mock('@/ai/provider/index', () => ({ aiProvider: h.provider }));

vi.mock('@/ai/cloud/aiCloud', () => ({
  getKeyBlob: async () => h.cloud.keyBlob,
  putKeyBlob: async (b: unknown) => void (h.cloud.keyBlob = b),
  deleteKeyBlob: async () => void (h.cloud.keyBlob = null),
  getConversation: async () => ({ envelope: h.cloud.conversation, etag: h.cloud.etag }),
  putConversation: async (env: unknown) => {
    h.cloud.conversation = env;
    h.cloud.etag = 'etag-' + Math.random().toString(36).slice(2);
    return h.cloud.etag;
  },
  deleteConversation: async () => void (h.cloud.conversation = null),
}));

vi.mock('@/ai/aiNotifications', () => ({
  notifyAiCloudSyncFailed: () => {},
  notifyAiKeyRemoved: () => {},
  notifyAiKeySetup: () => {},
  notifyAiPassphraseChanged: () => {},
  notifyIndexedDbUnavailable: () => {},
  notifyAiChatCompacted: () => {},
}));

import { useAiStore, aiPersistPartialize, mergeConversations } from '@/store/aiStore';
import { usePlannerStore } from '@/store/plannerStore';
import { baseConfig, m } from '@/engine/__tests__/factories';
import type { Conversation } from '@/ai/chat/conversation.types';

const planCfg = baseConfig({
  forecast: { startMonth: m('2025-01'), totalMonths: 12 },
  income: { monthly: 100_000 },
  cash: { openingBalance: 200_000 },
  expenses: { defaultMonthly: 60_000, overrides: {} },
});

beforeEach(() => {
  h.cloud.keyBlob = null;
  h.cloud.conversation = null;
  h.cloud.etag = null;
  useAiStore.getState().clearForSignOut();
  usePlannerStore.setState({ baseConfig: planCfg, config: planCfg, overrides: {}, baselineAccountIds: [] });
});

afterEach(() => {
  // Cancel any debounced write timer so it can't fire after the test.
  useAiStore.getState().clearForSignOut();
});

describe('aiStore — key setup', () => {
  it('validates, encrypts, and writes an empty chat → ready', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    const s = useAiStore.getState();
    expect(s.keyStatus).toBe('ready');
    expect(s.conversation.messages).toEqual([]);
    expect(h.cloud.keyBlob).toBeTruthy();
    expect(h.cloud.conversation).toBeTruthy();
  });

  it('rejects an invalid key and writes nothing', async () => {
    await expect(useAiStore.getState().setupKey('bad-key', 'passphrase1')).rejects.toMatchObject({
      kind: 'INVALID_KEY',
    });
    expect(useAiStore.getState().keyStatus).toBe('absent');
    expect(h.cloud.keyBlob).toBeNull();
  });

  it('never exposes the plaintext key in S3 or localStorage', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    const s = useAiStore.getState();
    expect(JSON.stringify(h.cloud.keyBlob)).not.toContain('AIzaTESTKEY');
    expect(JSON.stringify(h.cloud.conversation)).not.toContain('AIzaTESTKEY');
    expect(JSON.stringify(aiPersistPartialize(s))).not.toContain('AIzaTESTKEY');
  });
});

describe('aiStore — localStorage allow-list (security lock)', () => {
  it('persists ONLY settings + indexedDbWarningShown', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().send('hello');
    const persisted = aiPersistPartialize(useAiStore.getState());
    expect(Object.keys(persisted).sort()).toEqual(['indexedDbWarningShown', 'settings']);
    const json = JSON.stringify(persisted);
    expect(json).not.toContain('keyBlob');
    expect(json).not.toContain('ciphertext');
    expect(json).not.toContain('conversation');
    expect(json).not.toContain('message');
  });
});

describe('aiStore — send', () => {
  it('appends the user turn and the streamed assistant reply', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().send('hi there');
    const msgs = useAiStore.getState().conversation.messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: 'user', text: 'hi there' });
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].text).toBe('Hello there');
    expect(msgs[1].streaming).toBeFalsy();
    expect(useAiStore.getState().sending).toBe(false);
  });

  it('stamps a context epoch on the conversation', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().send('q');
    expect(useAiStore.getState().conversation.contextEpochId).toBeTruthy();
  });

  it('does nothing when no key is ready', async () => {
    await useAiStore.getState().send('hi');
    expect(useAiStore.getState().conversation.messages).toEqual([]);
  });
});

describe('aiStore — lifecycle', () => {
  it('loadConversationFromCloud starts fresh on a dead-epoch chat', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    h.cloud.conversation = { v: 1, keyEpoch: 'DEAD-EPOCH', iv: 'x', ciphertext: 'y' };
    h.cloud.etag = 'remote-etag';
    await useAiStore.getState().loadConversationFromCloud();
    expect(useAiStore.getState().conversation.messages).toEqual([]);
  });

  it('removeKey clears local state and both cloud objects', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().removeKey();
    expect(useAiStore.getState().keyStatus).toBe('absent');
    expect(h.cloud.keyBlob).toBeNull();
    expect(h.cloud.conversation).toBeNull();
  });

  it('stopStreaming is a safe no-op when idle', () => {
    expect(() => useAiStore.getState().stopStreaming()).not.toThrow();
  });
});

describe('mergeConversations (cross-device)', () => {
  const c = (ids: string[]): Conversation => ({
    v: 1,
    messages: ids.map((id) => ({ id, role: 'user', text: id, createdAt: 't' })),
    contextEpochId: 'e',
    startedAt: 't',
    updatedAt: 't',
  });

  it('keeps remote and appends local-only messages, deduped by id', () => {
    expect(mergeConversations(c(['a', 'b']), c(['a', 'b', 'c'])).messages.map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('never drops a remote message even when local is behind', () => {
    expect(mergeConversations(c(['a', 'b', 'c']), c(['a'])).messages.map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
