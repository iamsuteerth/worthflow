import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
  cloud: {
    keyBlob: null as unknown,
    conversation: null as unknown,
    etag: null as string | null,
    failPutKeyBlob: false,
    failPutConversation: false,
  },
  provider: {
    id: 'mock' as const,
    validateKeyError: null as Error | null,
    completeDelayMs: 0,
    validateKey: async (k: string) => {
      if (h.provider.validateKeyError) throw h.provider.validateKeyError;
      return k.startsWith('AIza');
    },
    complete: async function* () {
      if (h.provider.completeDelayMs) await new Promise((r) => setTimeout(r, h.provider.completeDelayMs));
      yield { textDelta: 'reply' };
    },
    proposeAction: async (): Promise<{ text: string; proposedActionJson: unknown; finishReason: 'stop' }> => {
      if (h.provider.completeDelayMs) await new Promise((r) => setTimeout(r, h.provider.completeDelayMs));
      return {
        text: 'json',
        proposedActionJson: { kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-01', amount: 50000, label: 'Mock' },
        finishReason: 'stop',
      };
    },
  },
}));

vi.mock('@/ai/provider/index', () => ({ aiProvider: h.provider }));

vi.mock('@/ai/cloud/aiCloud', () => ({
  getKeyBlob: async () => h.cloud.keyBlob,
  putKeyBlob: async (b: unknown) => {
    if (h.cloud.failPutKeyBlob) throw new Error('S3 down');
    h.cloud.keyBlob = b;
  },
  deleteKeyBlob: async () => void (h.cloud.keyBlob = null),
  getConversation: async () => ({ envelope: h.cloud.conversation, etag: h.cloud.etag }),
  putConversation: async (env: unknown) => {
    if (h.cloud.failPutConversation) throw new Error('S3 down');
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
  notifyAiActionApplied: () => {},
}));

import { useAiStore } from '@/store/aiStore';
import { usePlannerStore } from '@/store/plannerStore';
import { encryptConversation } from '@/ai/chat/conversationSync';
import { clearSessionKek } from '@/ai/keyVault/keyVault';
import { clearKek } from '@/ai/keyVault/kekCache';
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
  h.cloud.failPutKeyBlob = false;
  h.cloud.failPutConversation = false;
  h.provider.validateKeyError = null;
  h.provider.completeDelayMs = 0;
  useAiStore.getState().clearForSignOut();
  usePlannerStore.setState({ baseConfig: planCfg, config: planCfg, overrides: {}, baselineAccountIds: [], history: { past: [], future: [] } });
});

afterEach(() => {
  useAiStore.getState().clearForSignOut();
});

describe('setupKey — failure recovery', () => {
  it('falls back to absent (recoverable) when the blob upload fails, then succeeds on retry', async () => {
    h.cloud.failPutKeyBlob = true;
    await expect(useAiStore.getState().setupKey('AIzaKEY', 'passphrase1')).rejects.toMatchObject({
      kind: 'CLOUD_SYNC',
    });
    expect(useAiStore.getState().keyStatus).toBe('absent');

    h.cloud.failPutKeyBlob = false;
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    expect(useAiStore.getState().keyStatus).toBe('ready');
  });

  it('falls back to absent when the empty-chat write fails (blob may already be uploaded)', async () => {
    h.cloud.failPutConversation = true;
    await expect(useAiStore.getState().setupKey('AIzaKEY', 'passphrase1')).rejects.toMatchObject({
      kind: 'CLOUD_SYNC',
    });
    expect(useAiStore.getState().keyStatus).toBe('absent');
  });

  it('propagates a network error from validation itself without sticking in validating', async () => {
    const { AiError } = await import('@/ai/provider/types');
    h.provider.validateKeyError = new AiError('NETWORK', 'no net');
    await expect(useAiStore.getState().setupKey('AIzaKEY', 'passphrase1')).rejects.toMatchObject({
      kind: 'NETWORK',
    });
    expect(useAiStore.getState().keyStatus).toBe('absent');
  });
});

describe('forgotPassphrase — failure recovery', () => {
  it('falls back to locked when the re-mint upload fails (old blob still governs)', async () => {
    await useAiStore.getState().setupKey('AIzaOLD', 'passphrase1');
    h.cloud.failPutKeyBlob = true;
    await expect(useAiStore.getState().forgotPassphrase('AIzaNEW', 'passphrase2')).rejects.toMatchObject({
      kind: 'CLOUD_SYNC',
    });
    expect(useAiStore.getState().keyStatus).toBe('locked');
  });
});

describe('double-submit guard', () => {
  it('two overlapping send() calls produce exactly one turn', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    h.provider.completeDelayMs = 50;

    await Promise.all([useAiStore.getState().send('one'), useAiStore.getState().send('two')]);

    const msgs = useAiStore.getState().conversation.messages;
    expect(msgs.filter((x) => x.role === 'user').map((x) => x.text)).toEqual(['one']);
    expect(msgs).toHaveLength(2);
    expect(useAiStore.getState().sending).toBe(false);
  });

  it('two overlapping proposeAction() calls produce exactly one proposal', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    h.provider.completeDelayMs = 50;

    await Promise.all([
      useAiStore.getState().proposeAction('add expense A'),
      useAiStore.getState().proposeAction('add expense B'),
    ]);

    const msgs = useAiStore.getState().conversation.messages;
    expect(msgs.filter((x) => x.role === 'user')).toHaveLength(1);
    expect(msgs.filter((x) => x.proposedAction)).toHaveLength(1);
  });

  it('a proposeAction fired while send() streams is dropped', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    h.provider.completeDelayMs = 50;

    const sendP = useAiStore.getState().send('question');
    const proposeP = useAiStore.getState().proposeAction('and change something');
    await Promise.all([sendP, proposeP]);

    const msgs = useAiStore.getState().conversation.messages;
    expect(msgs.filter((x) => x.role === 'user').map((x) => x.text)).toEqual(['question']);
    expect(msgs.some((x) => x.proposedAction)).toBe(false);
  });
});

describe('loadConversationFromCloud — stale streaming flags', () => {
  it('normalises a persisted streaming:true message so it cannot spin forever', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');

    const stale: Conversation = {
      v: 1,
      messages: [
        { id: 'u1', role: 'user', text: 'q', createdAt: 't1' },
        { id: 'a1', role: 'assistant', text: 'partial…', createdAt: 't2', streaming: true },
      ],
      contextEpochId: 'e',
      startedAt: 't0',
      updatedAt: 't2',
    };
    h.cloud.conversation = await encryptConversation(stale);
    h.cloud.etag = 'etag-stale';

    await useAiStore.getState().loadConversationFromCloud();
    const a1 = useAiStore.getState().conversation.messages.find((x) => x.id === 'a1');
    expect(a1?.text).toBe('partial…');
    expect(a1?.streaming).toBeFalsy();
  });
});

describe('key lifecycle edges', () => {
  it('changePassphrase with the wrong old passphrase fails closed and keeps the blob usable', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    const blobBefore = useAiStore.getState().keyBlob;

    await expect(useAiStore.getState().changePassphrase('wrong-old', 'newpass22')).rejects.toMatchObject({
      kind: 'WRONG_PASSPHRASE',
    });
    expect(useAiStore.getState().keyBlob).toBe(blobBefore);

    // The session is still intact — a send works.
    await useAiStore.getState().send('still works?');
    expect(useAiStore.getState().conversation.messages.at(-1)?.text).toBe('reply');
  });

  it('send after removeKey is a no-op', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    await useAiStore.getState().removeKey();
    await useAiStore.getState().send('hello?');
    expect(useAiStore.getState().conversation.messages).toEqual([]);
  });

  it('unlock: wrong passphrase stays locked, right passphrase loads the chat', async () => {
    await useAiStore.getState().setupKey('AIzaKEY', 'passphrase1');
    await useAiStore.getState().send('hi');
    const savedMessages = useAiStore.getState().conversation.messages.length;
    // let the debounced write persist the chat before we simulate a fresh device
    const { flushConversationWrite } = await import('@/ai/chat/conversationSync');
    flushConversationWrite(useAiStore.getState, useAiStore.setState);
    await vi.waitFor(() => expect(h.cloud.conversation).toBeTruthy());

    // Fresh session on the same "device": no session KEK, no cached KEK.
    clearSessionKek();
    await clearKek();
    useAiStore.setState({ keyStatus: 'locked', conversation: { v: 1, messages: [], contextEpochId: 'e', startedAt: 't', updatedAt: 't' } });

    await expect(useAiStore.getState().unlock('wrong-pass')).rejects.toMatchObject({ kind: 'WRONG_PASSPHRASE' });
    expect(useAiStore.getState().keyStatus).toBe('locked');

    await useAiStore.getState().unlock('passphrase1');
    expect(useAiStore.getState().keyStatus).toBe('ready');
    expect(useAiStore.getState().conversation.messages).toHaveLength(savedMessages);
  });
});
