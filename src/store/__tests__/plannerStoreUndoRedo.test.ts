import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage shim for the zustand-persisted store (node env).
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

import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { usePlannerStore, HISTORY_LIMIT } from '@/store/plannerStore';

function loadBaseline() {
  const cfg = baseConfig({
    forecast: { startMonth: m('2025-01'), totalMonths: 12 },
    income: { monthly: 100_000 },
    cash: { openingBalance: 500_000 },
    expenses: { defaultMonthly: 40_000, overrides: {} },
    investments: {
      accounts: [account({ id: 'acc-1', name: 'Index Fund', startMonth: m('2025-01'), openingBalance: 100_000 })],
      amountOverrides: [],
      returnOverrides: [],
    },
  });
  usePlannerStore.getState().loadPlan(cfg, {}, []);
}

const s = () => usePlannerStore.getState();
const events = () => s().overrides.runtimeEvents ?? [];

beforeEach(() => loadBaseline());

describe('plannerStore — scenario undo/redo', () => {
  it('starts empty after a load (nothing to undo or redo)', () => {
    expect(s().canUndo()).toBe(false);
    expect(s().canRedo()).toBe(false);
  });

  it('undo reverts a change and redo reapplies it', () => {
    s().addTransientOneOffExpense(m('2025-03'), 1_000, 'Trip');
    expect(events()).toHaveLength(1);
    expect(s().canUndo()).toBe(true);

    s().undo();
    expect(events()).toHaveLength(0);
    expect(s().canUndo()).toBe(false);
    expect(s().canRedo()).toBe(true);

    s().redo();
    expect(events()).toHaveLength(1);
    expect(events()[0]).toMatchObject({ type: 'ONE_OFF_EXPENSE', amount: 1_000 });
  });

  it('config is rebuilt on every undo/redo (not just overrides)', () => {
    s().addTransientSpendingOverride(m('2025-02'), m('2025-05'), 10_000);
    const withOverride = s().config;
    s().undo();
    expect(s().config).not.toBe(withOverride);
    expect((s().config.expenses.overrides ?? {})['2025-02']).toBeUndefined();
  });

  it('a new action after undo clears the redo stack (no forked timeline)', () => {
    s().addTransientOneOffExpense(m('2025-03'), 1_000, 'A');
    s().addTransientOneOffExpense(m('2025-04'), 2_000, 'B');
    s().undo(); // drop B
    expect(s().canRedo()).toBe(true);

    s().addTransientBonusIncome(m('2025-05'), 3_000, 'C'); // new branch
    expect(s().canRedo()).toBe(false);
    const labels = events().map((e) => ('label' in e ? e.label : 'type' in e ? e.type : ''));
    expect(labels).toEqual(['A', 'BONUS_INCOME']);
  });

  it('caps the past stack at HISTORY_LIMIT', () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      s().addTransientOneOffExpense(m('2025-03'), 100 + i, `e${i}`);
    }
    expect(s().history.past.length).toBe(HISTORY_LIMIT);
  });

  it('reset clears the history (Reset cannot be undone back into)', () => {
    s().addTransientOneOffExpense(m('2025-03'), 1_000, 'A');
    s().resetOverrides();
    expect(s().canUndo()).toBe(false);
    expect(s().canRedo()).toBe(false);
  });

  it('an AI-tagged add and its provenance tag undo together as one step', () => {
    // Simulate applyAction's two store calls: the guarded add, then the tag.
    s().addTransientFd(m('2025-02'), 50_000, 7, 12, 'FD');
    const id = events()[0].id;
    s().tagAppliedChange(id, 'proposal-1');
    expect(events()[0].sourceProposalId).toBe('proposal-1');

    // ONE undo removes the whole thing — the tag never costs a separate step.
    s().undo();
    expect(events()).toHaveLength(0);

    // Redo restores the FD with its tag intact.
    s().redo();
    expect(events()[0]).toMatchObject({ type: 'FD', sourceProposalId: 'proposal-1' });
  });
});
