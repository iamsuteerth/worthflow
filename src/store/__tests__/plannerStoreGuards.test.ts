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

import { usePlannerStore } from '@/store/plannerStore';
import { baseConfig, account, m } from '@/engine/__tests__/factories';

function setPlan(over = {}) {
  const cfg = baseConfig({
    forecast: { startMonth: m('2025-01'), totalMonths: 12 },
    income: { monthly: 100_000 },
    cash: { openingBalance: 200_000 },
    expenses: { defaultMonthly: 60_000, overrides: {} },
    investments: {
      accounts: [account({ id: 'acc-1', name: 'Index Fund', startMonth: m('2025-01'), openingBalance: 100_000 })],
      amountOverrides: [],
      returnOverrides: [],
    },
    ...over,
  });
  usePlannerStore.setState({ baseConfig: cfg, config: cfg, overrides: {}, baselineAccountIds: ['acc-1'], savedScenarios: [] });
}

const events = () => usePlannerStore.getState().overrides.runtimeEvents ?? [];

beforeEach(() => setPlan());

describe('plannerStore — investment deposit cash guard', () => {
  it('rejects a deposit larger than available cash (no-op)', () => {
    usePlannerStore.getState().addTransientInvestmentDeposit('acc-1', m('2025-02'), 99_000_000);
    expect(events()).toHaveLength(0);
  });
  it('accepts a deposit within available cash', () => {
    usePlannerStore.getState().addTransientInvestmentDeposit('acc-1', m('2025-02'), 50_000);
    expect(events()).toHaveLength(1);
  });
});

describe('plannerStore — investment withdrawal balance guard', () => {
  it('rejects a withdrawal larger than the account balance (no-op)', () => {
    usePlannerStore.getState().addTransientInvestmentWithdrawal('acc-1', m('2025-02'), 99_000_000);
    expect(events()).toHaveLength(0);
  });
  it('accepts a withdrawal within the account balance', () => {
    usePlannerStore.getState().addTransientInvestmentWithdrawal('acc-1', m('2025-02'), 10_000);
    expect(events()).toHaveLength(1);
  });
});

describe('plannerStore — future-dated account opening cash guard', () => {
  it('rejects a future-dated account whose opening balance exceeds available cash', () => {
    const id = usePlannerStore.getState().createInvestmentAccount({
      name: 'Future', startMonth: m('2025-06'), openingBalance: 99_000_000,
      defaultAnnualReturn: 10, defaultMonthlyContribution: 0,
    });
    expect(id).toBeNull();
  });
  it('accepts a future-dated account within available cash', () => {
    const id = usePlannerStore.getState().createInvestmentAccount({
      name: 'Future', startMonth: m('2025-06'), openingBalance: 50_000,
      defaultAnnualReturn: 10, defaultMonthlyContribution: 0,
    });
    expect(id).toBeTruthy();
  });
  it('does NOT cap an account that starts at the forecast start (already-held wealth)', () => {
    const id = usePlannerStore.getState().createInvestmentAccount({
      name: 'Existing', startMonth: m('2025-01'), openingBalance: 99_000_000,
      defaultAnnualReturn: 10, defaultMonthlyContribution: 0,
    });
    expect(id).toBeTruthy();
  });
});
