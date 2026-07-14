import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage shim for the zustand-persisted plannerStore (node env).
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

import { affordabilityWarning } from '@/ai/actions/checkFeasibility';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { usePlannerStore } from '@/store/plannerStore';

beforeEach(() => {
  const cfg = baseConfig({
    forecast: { startMonth: m('2025-01'), totalMonths: 12 },
    income: { monthly: 100_000 },
    cash: { openingBalance: 150_000 },
    expenses: { defaultMonthly: 60_000, overrides: {} },
    investments: {
      accounts: [account({ id: 'acc-1', name: 'Index Fund', startMonth: m('2025-01'), openingBalance: 100_000, defaultMonthlyContribution: 0 })],
      amountOverrides: [],
      returnOverrides: [],
    },
  });
  usePlannerStore.getState().loadPlan(cfg, {}, []);
});

describe('affordabilityWarning — early FD/RD/deposit hint (advisory)', () => {
  it('warns when the amount exceeds free cash that month', () => {
    const w = affordabilityWarning({ kind: 'ADD_FD', amount: 99_000_000, month: '2025-02' });
    expect(w).toBeTruthy();
    expect(w).toMatch(/won't|may not fit|free/i);
  });

  it('returns null when the amount fits', () => {
    expect(affordabilityWarning({ kind: 'ADD_FD', amount: 50_000, month: '2025-02' })).toBeNull();
  });

  it('fails open on missing/invalid fields (no spurious warning)', () => {
    expect(affordabilityWarning({ kind: 'ADD_FD', amount: 200_000 })).toBeNull(); // no month
    expect(affordabilityWarning({ kind: 'ADD_FD', month: '2025-02' })).toBeNull(); // no amount
    expect(affordabilityWarning(null)).toBeNull();
    expect(affordabilityWarning({})).toBeNull();
  });

  it('returns null for a month outside the forecast window (validateAction handles that)', () => {
    expect(affordabilityWarning({ kind: 'ADD_FD', amount: 99_000_000, month: '2099-01' })).toBeNull();
  });

  it('uses the account balance (not cash) for a withdrawal hint', () => {
    const tooBig = affordabilityWarning({ kind: 'ADD_INVESTMENT_WITHDRAWAL', amount: 99_000_000, month: '2025-02', accountName: 'Index Fund' });
    expect(tooBig).toBeTruthy();
    const ok = affordabilityWarning({ kind: 'ADD_INVESTMENT_WITHDRAWAL', amount: 10_000, month: '2025-02', accountName: 'Index Fund' });
    expect(ok).toBeNull();
    // Unknown account → can't assess → no warning.
    expect(affordabilityWarning({ kind: 'ADD_INVESTMENT_WITHDRAWAL', amount: 10_000, month: '2025-02', accountName: 'Nope' })).toBeNull();
  });
});
