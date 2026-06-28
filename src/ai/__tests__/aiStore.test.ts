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
    // Canned, schema-valid, in-window action for the propose→apply→undo flow.
    // (Return type widened so tests can swap in clarify / infeasible payloads.)
    proposeAction: async (): Promise<{ text: string; proposedActionJson: unknown; finishReason: 'stop' }> => ({
      text: 'json',
      proposedActionJson: { kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-01', amount: 50000, label: 'Mock' },
      finishReason: 'stop',
    }),
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
  notifyAiActionApplied: () => {},
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
  usePlannerStore.setState({ baseConfig: planCfg, config: planCfg, overrides: {}, baselineAccountIds: [], history: { past: [], future: [] } });
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

describe('aiStore — assisted actions (Phase 2)', () => {
  it('proposes a pending action without mutating the plan', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().proposeAction('add a big expense');

    const msgs = useAiStore.getState().conversation.messages;
    const proposal = msgs.find((m) => m.proposedAction);
    expect(proposal).toBeTruthy();
    expect(proposal!.actionStatus).toBe('pending');
    // Nothing is applied before the user clicks Apply.
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('applies on confirm (one tagged runtime event), is idempotent, and undoes via the planner', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().proposeAction('add a big expense');
    const id = useAiStore.getState().conversation.messages.find((m) => m.proposedAction)!.id;

    useAiStore.getState().applyProposedAction(id);
    // "applied" is derived from the plan — the event is tagged with the message id.
    const evs = usePlannerStore.getState().overrides.runtimeEvents ?? [];
    expect(evs).toHaveLength(1);
    expect(evs[0].sourceProposalId).toBe(id);

    // Re-applying the same proposal must never double-count (the bug this closes).
    useAiStore.getState().applyProposedAction(id);
    useAiStore.getState().applyProposedAction(id);
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(1);

    // The scenario undo (shared across the app) reverts it in one step.
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
    // Redo brings it back, tag intact.
    usePlannerStore.getState().redo();
    const after = usePlannerStore.getState().overrides.runtimeEvents ?? [];
    expect(after).toHaveLength(1);
    expect(after[0].sourceProposalId).toBe(id);
  });

  it('dismiss changes nothing', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().proposeAction('add a big expense');
    const id = useAiStore.getState().conversation.messages.find((m) => m.proposedAction)!.id;

    useAiStore.getState().dismissProposedAction(id);
    expect(useAiStore.getState().conversation.messages.find((m) => m.id === id)!.actionStatus).toBe('dismissed');
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('does nothing when no key is ready', async () => {
    await useAiStore.getState().proposeAction('add a big expense');
    expect(useAiStore.getState().conversation.messages).toEqual([]);
  });

  it('renders a clarify reply (multi-action) as plain text, no card, no mutation', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    const original = h.provider.proposeAction;
    h.provider.proposeAction = async () => ({
      text: 'json',
      proposedActionJson: { clarify: 'I can apply one change at a time — which first?' },
      finishReason: 'stop' as const,
    });
    try {
      await useAiStore.getState().proposeAction('add an expense and an FD and a bonus');
    } finally {
      h.provider.proposeAction = original;
    }
    const msgs = useAiStore.getState().conversation.messages;
    const last = msgs[msgs.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.proposedAction).toBeUndefined();
    expect(last.text).toContain('one change at a time');
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('marks an infeasible action as failed on apply with a reason', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    const original = h.provider.proposeAction;
    h.provider.proposeAction = async () => ({
      text: 'json',
      proposedActionJson: { kind: 'ADD_FD', month: '2025-01', principal: 99_000_000, rate: 7, durationMonths: 12, name: 'Big' },
      finishReason: 'stop' as const,
    });
    try {
      await useAiStore.getState().proposeAction('huge fd');
    } finally {
      h.provider.proposeAction = original;
    }
    const id = useAiStore.getState().conversation.messages.find((mm) => mm.proposedAction)!.id;
    useAiStore.getState().applyProposedAction(id);
    const msg = useAiStore.getState().conversation.messages.find((mm) => mm.id === id)!;
    expect(msg.actionStatus).toBe('failed');
    expect(msg.actionError).toBeTruthy();
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('renders a missing-info clarify (one change, missing fields) as plain text', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    const original = h.provider.proposeAction;
    h.provider.proposeAction = async () => ({
      text: 'json',
      proposedActionJson: {
        clarify: 'An FD needs an interest rate and a duration — what rate (% p.a.) and how many months?',
      },
      finishReason: 'stop' as const,
    });
    try {
      await useAiStore.getState().proposeAction('create an FD of 1.6L in September');
    } finally {
      h.provider.proposeAction = original;
    }
    const msgs = useAiStore.getState().conversation.messages;
    const last = msgs[msgs.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.proposedAction).toBeUndefined();
    expect(last.actionError).toBeUndefined();
    expect(last.text).toContain('interest rate and a duration');
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('does not duplicate the latest user message into the request history', async () => {
    await useAiStore.getState().setupKey('AIzaTESTKEY', 'passphrase1');
    await useAiStore.getState().send('first question'); // seed a prior turn
    let capturedHistory: { role: string; text: string }[] = [];
    const original = h.provider.proposeAction;
    h.provider.proposeAction = async (req?: { history?: { role: string; text: string }[] }) => {
      capturedHistory = req?.history ?? [];
      return {
        text: 'json',
        proposedActionJson: { kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-01', amount: 50000, label: 'Mock' },
        finishReason: 'stop' as const,
      };
    };
    try {
      await useAiStore.getState().proposeAction('please add a one-off expense');
    } finally {
      h.provider.proposeAction = original;
    }
    // The latest user message is passed as `userMessage`, NOT also in history
    // (duplicating it produced two consecutive user turns — see §1).
    expect(capturedHistory.some((x) => x.text === 'please add a one-off expense')).toBe(false);
    // The prior turn is still present.
    expect(capturedHistory.some((x) => x.text === 'first question')).toBe(true);
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
