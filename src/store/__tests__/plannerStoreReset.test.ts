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
import { usePlannerStore } from '@/store/plannerStore';

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
  // loadPlan snapshots baselineConfig — the state a reset restores to.
  usePlannerStore.getState().loadPlan(cfg, {}, []);
}

const baseAccounts = () => usePlannerStore.getState().baseConfig.investments.accounts;
const effectiveAccounts = () => usePlannerStore.getState().config.investments.accounts;
const scenarioAccounts = () => usePlannerStore.getState().overrides.scenarioAccounts ?? [];
const events = () => usePlannerStore.getState().overrides.runtimeEvents ?? [];

function createScenarioAccount(name = 'Scenario Acc') {
  return usePlannerStore.getState().createInvestmentAccount({
    name, startMonth: m('2025-01'), openingBalance: 50_000,
    defaultAnnualReturn: 10, defaultMonthlyContribution: 0,
  });
}

beforeEach(() => loadBaseline());

describe('plannerStore — scenario-created accounts are a what-if (never in baseConfig)', () => {
  it('lives in overrides.scenarioAccounts, not baseConfig (so the Builder never sees it)', () => {
    const id = createScenarioAccount();
    expect(id).toBeTruthy();
    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1', id]); // visible to the engine/UI
    expect(baseAccounts().map((a) => a.id)).toEqual(['acc-1']); // but NOT in the base plan
    expect(scenarioAccounts().map((a) => a.id)).toEqual([id]);
  });

  it('uniquifies a scenario account name against base + existing scenario accounts', () => {
    createScenarioAccount('Index Fund'); // collides with the base account name
    expect(effectiveAccounts().map((a) => a.name)).toEqual(['Index Fund', 'Index Fund (2)']);
  });
});

describe('plannerStore — resetOverrides fully restores the baseline', () => {
  it('removes a scenario-created account', () => {
    createScenarioAccount();
    expect(effectiveAccounts()).toHaveLength(2);

    usePlannerStore.getState().resetOverrides();

    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1']);
    expect(scenarioAccounts()).toHaveLength(0);
  });

  it('hides a deleted base account reversibly (baseConfig untouched) and Reset brings it back', () => {
    usePlannerStore.getState().deleteInvestmentAccount('acc-1');
    // Hidden from the effective config, but baseConfig is never mutated.
    expect(effectiveAccounts()).toHaveLength(0);
    expect(baseAccounts().map((a) => a.id)).toEqual(['acc-1']);
    expect(usePlannerStore.getState().overrides.deletedAccountIds).toEqual(['acc-1']);

    usePlannerStore.getState().resetOverrides();

    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1']);
    expect(usePlannerStore.getState().overrides.deletedAccountIds ?? []).toHaveLength(0);
  });

  it('clears all scenario overrides', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1_000, 'x');
    usePlannerStore.getState().addTransientSpendingOverride(m('2025-02'), m('2025-05'), 20_000);
    expect(events().length).toBeGreaterThan(0);

    usePlannerStore.getState().resetOverrides();

    expect(events()).toHaveLength(0);
  });

  it('a scenario account stays a what-if: Reset clears it even after the plan is saved', () => {
    createScenarioAccount();
    usePlannerStore.getState().markSaved(); // the account is saved WITH the plan (in overrides)…
    expect(scenarioAccounts()).toHaveLength(1);

    usePlannerStore.getState().resetOverrides(); // …but Reset still clears the what-if

    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1']);
    expect(scenarioAccounts()).toHaveLength(0);
  });
});

describe('plannerStore — cascade + deletion', () => {
  it('deletes a scenario account and cascades its deposits/overrides', () => {
    const id = createScenarioAccount();
    if (!id) throw new Error('account not created');
    usePlannerStore.getState().addTransientInvestmentDeposit(id, m('2025-02'), 10_000);
    expect(events().some((e) => 'accountId' in e && e.accountId === id)).toBe(true);

    usePlannerStore.getState().deleteInvestmentAccount(id);

    expect(scenarioAccounts()).toHaveLength(0);
    expect(events().some((e) => 'accountId' in e && e.accountId === id)).toBe(false);
    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1']);
    // A scenario account is removed outright — it never enters deletedAccountIds.
    expect(usePlannerStore.getState().overrides.deletedAccountIds ?? []).toHaveLength(0);
  });

  it('deleting a BASE account cascades its scenario deposits and overrides', () => {
    usePlannerStore.getState().addTransientInvestmentDeposit('acc-1', m('2025-03'), 10_000);
    usePlannerStore.getState().addTransientAccountAmountOverride('acc-1', m('2025-02'), m('2025-05'), 8_000);
    expect(events().some((e) => 'accountId' in e && e.accountId === 'acc-1')).toBe(true);

    usePlannerStore.getState().deleteInvestmentAccount('acc-1');

    // Hidden via override, dependent scenario events cascaded away, nothing dangling.
    expect(usePlannerStore.getState().overrides.deletedAccountIds).toEqual(['acc-1']);
    expect(events().some((e) => 'accountId' in e && e.accountId === 'acc-1')).toBe(false);
    expect(effectiveAccounts()).toHaveLength(0);
    // …and Reset brings the base account back.
    usePlannerStore.getState().resetOverrides();
    expect(effectiveAccounts().map((a) => a.id)).toEqual(['acc-1']);
  });
});

describe('plannerStore — resetAll', () => {
  it('clears saved scenarios and the plan', () => {
    usePlannerStore.getState().saveScenario('S1');
    expect(usePlannerStore.getState().savedScenarios).toHaveLength(1);

    usePlannerStore.getState().resetAll();

    expect(usePlannerStore.getState().savedScenarios).toHaveLength(0);
    expect(effectiveAccounts()).toHaveLength(0);
  });
});
