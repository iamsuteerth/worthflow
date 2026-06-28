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

import { proposedActionSchema, isUndoableAdd } from '@/ai/actions/actionSchema';
import { validateAction, resolveAccountName } from '@/ai/actions/validateAction';
import { checkFeasibility } from '@/ai/actions/checkFeasibility';
import { applyAction } from '@/ai/actions/applyAction';
import { isProposalApplied } from '@/ai/actions/proposalState';
import { dryRun } from '@/ai/actions/dryRun';
import { describeAction } from '@/ai/actions/describeAction';
import { usePlannerStore } from '@/store/plannerStore';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// A plan with cash, an income surplus, and one investment account.
function setupPlan() {
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
  });
  usePlannerStore.setState({ baseConfig: cfg, config: cfg, overrides: {}, baselineAccountIds: ['acc-1'], savedScenarios: [], history: { past: [], future: [] } });
}

function ctxFor() {
  const s = usePlannerStore.getState();
  return {
    startMonth: s.config.forecast.startMonth,
    totalMonths: s.config.forecast.totalMonths,
    accountNames: s.config.investments.accounts.map((a) => a.name),
    scenarioEventIds: (s.overrides.runtimeEvents ?? []).map((e) => e.id),
  };
}

const events = () => usePlannerStore.getState().overrides.runtimeEvents ?? [];

// Validate an action and return the resolved form (throws if invalid).
function valid(json: unknown): ResolvedProposedAction {
  const r = validateAction(json, ctxFor());
  if (!r.ok) throw new Error(`expected valid, got: ${r.message}`);
  return r.action;
}

beforeEach(setupPlan);

// ===========================================================================
describe('actionSchema (layer 1 — shape)', () => {
  const validSamples: unknown[] = [
    { kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 5000, label: 'Trip' },
    { kind: 'ADD_CREDIT_CARD_EXPENSE', month: '2025-03', amount: 5000, label: 'Card' },
    { kind: 'ADD_RECURRING_EXPENSE', name: 'Rent', amount: 20000, startMonth: '2025-01', endMonth: '2025-06', frequency: 'MONTHLY' },
    { kind: 'ADD_BONUS_INCOME', month: '2025-03', amount: 5000, description: 'Bonus' },
    { kind: 'ADD_SALARY_CHANGE', effectiveMonth: '2025-03', newMonthlyIncome: 0, description: 'Sabbatical' },
    { kind: 'ADD_SPENDING_OVERRIDE', startMonth: '2025-01', endMonth: '2025-06', amount: 0 },
    { kind: 'SET_OPENING_CASH_OVERRIDE', amount: -50000 },
    { kind: 'ADD_FD', month: '2025-03', principal: 100000, rate: 7, durationMonths: 12, name: 'FD' },
    { kind: 'ADD_RD', month: '2025-03', monthlyContribution: 5000, rate: 7, durationMonths: 12, name: 'RD' },
    { kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Index Fund', month: '2025-03', amount: 5000 },
    { kind: 'ADD_INVESTMENT_WITHDRAWAL', accountName: 'Index Fund', month: '2025-03', amount: 5000 },
    { kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'NPS', startMonth: '2025-01', openingBalance: 1000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 },
    { kind: 'ADD_ACCOUNT_AMOUNT_OVERRIDE', accountName: 'Index Fund', startMonth: '2025-03', endMonth: '2025-06', amount: 1000 },
    { kind: 'ADD_ACCOUNT_RETURN_OVERRIDE', accountName: 'Index Fund', startMonth: '2025-03', endMonth: '2025-06', annualReturn: 8 },
    { kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 5000 },
    { kind: 'DELETE_SCENARIO_EVENT', ref: 1 },
  ];

  it('accepts every valid sample (one per kind)', () => {
    for (const s of validSamples) {
      expect(proposedActionSchema.safeParse(s).success, JSON.stringify(s)).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    expect(proposedActionSchema.safeParse({ kind: 'DELETE_ACCOUNT', accountName: 'x' }).success).toBe(false);
  });

  it('rejects non-positive amounts where positive is required', () => {
    expect(proposedActionSchema.safeParse({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 0, label: 'x' }).success).toBe(false);
    expect(proposedActionSchema.safeParse({ kind: 'ADD_FD', month: '2025-03', principal: -1, rate: 7, durationMonths: 12, name: 'x' }).success).toBe(false);
  });

  it('rejects a malformed month', () => {
    expect(proposedActionSchema.safeParse({ kind: 'ADD_BONUS_INCOME', month: '2025-13', amount: 1, description: 'x' }).success).toBe(false);
  });

  it('enforces FD/RD rate (0–15) and duration (1–120)', () => {
    expect(proposedActionSchema.safeParse({ kind: 'ADD_FD', month: '2025-03', principal: 1, rate: 20, durationMonths: 12, name: 'x' }).success).toBe(false);
    expect(proposedActionSchema.safeParse({ kind: 'ADD_RD', month: '2025-03', monthlyContribution: 1, rate: 7, durationMonths: 200, name: 'x' }).success).toBe(false);
  });

  it('enforces account return bounds (-99.99–1000)', () => {
    expect(proposedActionSchema.safeParse({ kind: 'ADD_ACCOUNT_RETURN_OVERRIDE', accountName: 'x', startMonth: '2025-01', endMonth: '2025-02', annualReturn: 5000 }).success).toBe(false);
  });

  it('rejects an account with neither opening balance nor contribution (refine)', () => {
    expect(proposedActionSchema.safeParse({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'x', startMonth: '2025-01', openingBalance: 0, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 }).success).toBe(false);
  });

  it('rejects an edit that changes no field (refine)', () => {
    expect(proposedActionSchema.safeParse({ kind: 'EDIT_SCENARIO_EVENT', ref: 1 }).success).toBe(false);
  });

  it('isUndoableAdd: true for runtime-event adds, false for create-account/edit/delete', () => {
    expect(isUndoableAdd('ADD_ONE_OFF_EXPENSE')).toBe(true);
    expect(isUndoableAdd('ADD_ACCOUNT_AMOUNT_OVERRIDE')).toBe(true);
    expect(isUndoableAdd('CREATE_INVESTMENT_ACCOUNT')).toBe(false);
    expect(isUndoableAdd('EDIT_SCENARIO_EVENT')).toBe(false);
    expect(isUndoableAdd('DELETE_SCENARIO_EVENT')).toBe(false);
  });
});

// ===========================================================================
describe('validateAction (layer 1 — semantics + refs)', () => {
  it('accepts in-window, rejects out-of-window', () => {
    expect(validateAction({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-06', amount: 1000, label: 'x' }, ctxFor()).ok).toBe(true);
    expect(validateAction({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2030-01', amount: 1000, label: 'x' }, ctxFor()).ok).toBe(false);
  });

  it('rejects start > end and invalid annual range', () => {
    expect(validateAction({ kind: 'ADD_SPENDING_OVERRIDE', startMonth: '2025-06', endMonth: '2025-03', amount: 1000 }, ctxFor()).ok).toBe(false);
    expect(validateAction({ kind: 'ADD_RECURRING_EXPENSE', name: 'x', amount: 1000, startMonth: '2025-01', endMonth: '2025-06', frequency: 'ANNUAL' }, ctxFor()).ok).toBe(false);
  });

  it('fails closed on unknown account name (deposit and override)', () => {
    expect(validateAction({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Nope', month: '2025-03', amount: 1000 }, ctxFor()).ok).toBe(false);
    expect(validateAction({ kind: 'ADD_ACCOUNT_AMOUNT_OVERRIDE', accountName: 'Nope', startMonth: '2025-03', endMonth: '2025-06', amount: 1000 }, ctxFor()).ok).toBe(false);
  });

  it('rejects a create-account outside the window', () => {
    expect(validateAction({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'x', startMonth: '2030-01', openingBalance: 1000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 }, ctxFor()).ok).toBe(false);
  });

  it('resolves an edit/delete ref to a target event id', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1000, 'Trip');
    const edit = validateAction({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 2000 }, ctxFor());
    expect(edit.ok).toBe(true);
    if (edit.ok && edit.action.kind === 'EDIT_SCENARIO_EVENT') {
      expect(edit.action.targetEventId).toBe(events()[0].id);
    }
    const del = validateAction({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 }, ctxFor());
    expect(del.ok).toBe(true);
  });

  it('rejects an out-of-range ref', () => {
    expect(validateAction({ kind: 'DELETE_SCENARIO_EVENT', ref: 5 }, ctxFor()).ok).toBe(false);
  });

  it('discards malformed JSON', () => {
    expect(validateAction({ kind: 'NONSENSE' }, ctxFor()).ok).toBe(false);
    expect(validateAction(null, ctxFor()).ok).toBe(false);
  });
});

describe('resolveAccountName (fail-closed)', () => {
  it('exact, unique-CI, unknown, ambiguous', () => {
    expect(resolveAccountName('Index Fund', ['Index Fund', 'NPS'])).toEqual({ ok: true, name: 'Index Fund' });
    expect(resolveAccountName('index fund', ['Index Fund'])).toEqual({ ok: true, name: 'Index Fund' });
    expect(resolveAccountName('Crypto', ['Index Fund']).ok).toBe(false);
    expect(resolveAccountName('fund', ['Fund', 'FUND']).ok).toBe(false);
  });
});

// ===========================================================================
describe('checkFeasibility (layer 1.5 — pre-flag against the live plan)', () => {
  it('FD/RD: feasible within cash, infeasible beyond', () => {
    expect(checkFeasibility(valid({ kind: 'ADD_FD', month: '2025-02', principal: 50000, rate: 7, durationMonths: 12, name: 'FD' })).feasible).toBe(true);
    const big = checkFeasibility(valid({ kind: 'ADD_FD', month: '2025-02', principal: 99_000_000, rate: 7, durationMonths: 12, name: 'FD' }));
    expect(big.feasible).toBe(false);
    if (!big.feasible) expect(big.reason.toLowerCase()).toContain('cash');
  });

  it('deposit: capped by available cash', () => {
    expect(checkFeasibility(valid({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Index Fund', month: '2025-02', amount: 50000 })).feasible).toBe(true);
    expect(checkFeasibility(valid({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Index Fund', month: '2025-02', amount: 99_000_000 })).feasible).toBe(false);
  });

  it('withdrawal: capped by account balance', () => {
    expect(checkFeasibility(valid({ kind: 'ADD_INVESTMENT_WITHDRAWAL', accountName: 'Index Fund', month: '2025-02', amount: 10000 })).feasible).toBe(true);
    expect(checkFeasibility(valid({ kind: 'ADD_INVESTMENT_WITHDRAWAL', accountName: 'Index Fund', month: '2025-02', amount: 99_000_000 })).feasible).toBe(false);
  });

  it('create account: future-dated capped by cash; forecast-start uncapped', () => {
    expect(checkFeasibility(valid({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'A', startMonth: '2025-06', openingBalance: 99_000_000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 })).feasible).toBe(false);
    expect(checkFeasibility(valid({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'B', startMonth: '2025-06', openingBalance: 50000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 })).feasible).toBe(true);
    expect(checkFeasibility(valid({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'C', startMonth: '2025-01', openingBalance: 99_000_000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 })).feasible).toBe(true);
  });

  it('spending override: overlap is infeasible', () => {
    usePlannerStore.getState().addTransientSpendingOverride(m('2025-01'), m('2025-06'), 70000);
    expect(checkFeasibility(valid({ kind: 'ADD_SPENDING_OVERRIDE', startMonth: '2025-04', endMonth: '2025-08', amount: 80000 })).feasible).toBe(false);
    expect(checkFeasibility(valid({ kind: 'ADD_SPENDING_OVERRIDE', startMonth: '2025-07', endMonth: '2025-09', amount: 80000 })).feasible).toBe(true);
  });

  it('account amount override: overlap and pre-start are infeasible', () => {
    usePlannerStore.getState().addTransientAccountAmountOverride('acc-1', m('2025-03'), m('2025-06'), 1000);
    expect(checkFeasibility(valid({ kind: 'ADD_ACCOUNT_AMOUNT_OVERRIDE', accountName: 'Index Fund', startMonth: '2025-05', endMonth: '2025-08', amount: 2000 })).feasible).toBe(false);
    expect(checkFeasibility(valid({ kind: 'ADD_ACCOUNT_AMOUNT_OVERRIDE', accountName: 'Index Fund', startMonth: '2025-07', endMonth: '2025-09', amount: 2000 })).feasible).toBe(true);
  });

  it('edit: raising an FD principal beyond cash is infeasible', () => {
    usePlannerStore.getState().addTransientFd(m('2025-02'), 50000, 7, 12, 'FD');
    expect(checkFeasibility(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 99_000_000 })).feasible).toBe(false);
    expect(checkFeasibility(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 60000 })).feasible).toBe(true);
  });

  it('edit: non-positive expense amount infeasible; negative opening-cash feasible', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1000, 'Trip');
    expect(checkFeasibility(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 0 })).feasible).toBe(false);
    setupPlan();
    usePlannerStore.getState().addTransientOpeningCashOverride(100000);
    expect(checkFeasibility(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: -50000 })).feasible).toBe(true);
  });

  it('edit: a field that does not apply to the target type is infeasible', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1000, 'Trip');
    expect(checkFeasibility(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, annualReturn: 5 })).feasible).toBe(false);
  });

  it('delete: feasible for an existing event', () => {
    usePlannerStore.getState().addTransientBonusIncome(m('2025-03'), 1000, 'B');
    expect(checkFeasibility(valid({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 })).feasible).toBe(true);
  });

  it('plain additions are always feasible', () => {
    expect(checkFeasibility(valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 1000, label: 'x' })).feasible).toBe(true);
    expect(checkFeasibility(valid({ kind: 'ADD_SALARY_CHANGE', effectiveMonth: '2025-03', newMonthlyIncome: 120000, description: 'raise' })).feasible).toBe(true);
  });
});

// ===========================================================================
describe('applyAction (layer 2 — guarded store path)', () => {
  it('adds exactly one runtime event, returns its id, and stamps the proposal id', () => {
    const r = applyAction(valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 1000, label: 'Trip' }), 'p1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.eventId).toBeTruthy();
      const ev = events().find((e) => e.id === r.eventId);
      expect(ev).toBeTruthy();
      expect(ev?.sourceProposalId).toBe('p1');
    }
  });

  it('is idempotent — re-applying the same proposal never double-counts', () => {
    const action = valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 1000, label: 'Trip' });
    expect(applyAction(action, 'p1').ok).toBe(true);
    expect(applyAction(action, 'p1').ok).toBe(true); // no-op
    expect(applyAction(action, 'p1').ok).toBe(true); // still no-op
    expect(events()).toHaveLength(1);
  });

  it('maps each account-targeted add through the right method', () => {
    expect(applyAction(valid({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Index Fund', month: '2025-03', amount: 5000 }), 'p1').ok).toBe(true);
    expect(events()[0]).toMatchObject({ type: 'INVESTMENT_DEPOSIT', accountId: 'acc-1', amount: 5000 });
  });

  it('creates an investment account (no undo event id) and stamps the proposal id', () => {
    const r = applyAction(valid({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'NPS', startMonth: '2025-01', openingBalance: 10000, defaultMonthlyContribution: 0, defaultAnnualReturn: 10 }), 'p1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.eventId).toBeUndefined();
    const created = usePlannerStore.getState().overrides.scenarioAccounts?.find((a) => a.name === 'NPS');
    expect(created?.sourceProposalId).toBe('p1');
    expect(usePlannerStore.getState().config.investments.accounts.some((a) => a.name === 'NPS')).toBe(true);
  });

  it('edits an existing event in place', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1000, 'Trip');
    const r = applyAction(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 2500 }), 'p1');
    expect(r.ok).toBe(true);
    expect(events()[0]).toMatchObject({ type: 'ONE_OFF_EXPENSE', amount: 2500, sourceProposalId: 'p1' });
  });

  it('deletes an existing event', () => {
    usePlannerStore.getState().addTransientBonusIncome(m('2025-03'), 1000, 'B');
    const r = applyAction(valid({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 }), 'p1');
    expect(r.ok).toBe(true);
    expect(events()).toHaveLength(0);
  });

  it('refuses an infeasible action (unaffordable FD) without adding anything', () => {
    const r = applyAction(valid({ kind: 'ADD_FD', month: '2025-02', principal: 99_000_000, rate: 7, durationMonths: 12, name: 'Big' }), 'p1');
    expect(r.ok).toBe(false);
    expect(events()).toHaveLength(0);
  });

  it('fails closed on an unknown account name', () => {
    const r = applyAction({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Ghost', month: m('2025-03'), amount: 5000 } as ResolvedProposedAction, 'p1');
    expect(r.ok).toBe(false);
    expect(events()).toHaveLength(0);
  });

  it('an applied add is undoable via deleteRuntimeEvent', () => {
    const r = applyAction(valid({ kind: 'ADD_BONUS_INCOME', month: '2025-04', amount: 10000, description: 'Bonus' }), 'p1');
    expect(r.ok).toBe(true);
    if (r.ok && r.eventId) usePlannerStore.getState().deleteRuntimeEvent(r.eventId);
    expect(events()).toHaveLength(0);
  });
});

// ===========================================================================
describe('isProposalApplied (derived from the loaded plan — the cross-device truth)', () => {
  it('is false before apply, true once the plan carries the tagged change', () => {
    const action = valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 1000, label: 'Trip' });
    expect(isProposalApplied(action, 'p1', usePlannerStore.getState().overrides)).toBe(false);
    applyAction(action, 'p1');
    expect(isProposalApplied(action, 'p1', usePlannerStore.getState().overrides)).toBe(true);
  });

  it('derives applied per-device: the same proposal id reads false against a plan without the tag', () => {
    const action = valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 1000, label: 'Trip' });
    applyAction(action, 'p1');
    // A second device's plan (no tag) — the card there must NOT claim "applied".
    expect(isProposalApplied(action, 'p1', {})).toBe(false);
  });

  it('a delete is applied once its target event is gone', () => {
    usePlannerStore.getState().addTransientBonusIncome(m('2025-03'), 1000, 'B');
    const action = valid({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 });
    expect(isProposalApplied(action, 'p1', usePlannerStore.getState().overrides)).toBe(false);
    applyAction(action, 'p1');
    expect(isProposalApplied(action, 'p1', usePlannerStore.getState().overrides)).toBe(true);
  });
});

// ===========================================================================
describe('dryRun (preview — never mutates the live store)', () => {
  it('returns a headline delta and leaves the store untouched', () => {
    const before = events().length;
    const delta = dryRun(valid({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 100_000, label: 'Big' }));
    expect(delta).not.toBeNull();
    expect(delta!.finalNetWorthAfter).toBeLessThan(delta!.finalNetWorthBefore);
    expect(events().length).toBe(before);
  });

  it('previews a create-account without mutating', () => {
    const delta = dryRun(valid({ kind: 'CREATE_INVESTMENT_ACCOUNT', name: 'NPS', startMonth: '2025-01', openingBalance: 100000, defaultMonthlyContribution: 5000, defaultAnnualReturn: 12 }));
    expect(delta).not.toBeNull();
    expect(usePlannerStore.getState().config.investments.accounts.some((a) => a.name === 'NPS')).toBe(false);
  });

  it('previews edit and delete', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 100_000, 'Trip');
    const editDelta = dryRun(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 1000 }));
    expect(editDelta).not.toBeNull();
    const delDelta = dryRun(valid({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 }));
    expect(delDelta).not.toBeNull();
    // Still present — dry run didn't mutate.
    expect(events()).toHaveLength(1);
  });

  it('returns null for an unresolvable account', () => {
    expect(dryRun({ kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Ghost', month: m('2025-03'), amount: 1000 } as ResolvedProposedAction)).toBeNull();
  });
});

// ===========================================================================
describe('describeAction — EDIT describes only applicable fields', () => {
  it('drops a field the target type cannot change (one-off expense + rate)', () => {
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 1000, 'Trip');
    // A one-off expense maps amount/month only — rate must NOT appear in the preview.
    const text = describeAction(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 2000, rate: 8 }));
    expect(text).toContain('amount to');
    expect(text.toLowerCase()).not.toContain('rate');
  });

  it('describes every applicable field for an FD edit', () => {
    usePlannerStore.getState().addTransientFd(m('2025-02'), 50_000, 7, 12, 'FD');
    const text = describeAction(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 60_000, rate: 8, durationMonths: 24 }));
    expect(text).toContain('amount to');
    expect(text).toContain('rate to 8%');
    expect(text).toContain('duration to 24 months');
  });

  it('says "no applicable change" when the field does not apply to the target', () => {
    usePlannerStore.getState().addTransientAccountReturnOverride('acc-1', m('2025-03'), m('2025-06'), 8);
    // A return override only accepts annualReturn — a bare amount maps to nothing.
    const text = describeAction(valid({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, amount: 5 }));
    expect(text.toLowerCase()).toContain('no applicable change');
  });
});

// ===========================================================================
describe('validateAction — ref resolution stays correct with numbered changes', () => {
  it('resolves a 1-based ref to the matching runtime event id', () => {
    const store = usePlannerStore.getState();
    store.addTransientOneOffExpense(m('2025-03'), 1000, 'A'); // ref 1
    store.addTransientBonusIncome(m('2025-04'), 2000, 'B');   // ref 2
    const ids = events().map((e) => e.id);

    const edit = validateAction({ kind: 'EDIT_SCENARIO_EVENT', ref: 2, amount: 3000 }, ctxFor());
    expect(edit.ok).toBe(true);
    if (edit.ok && edit.action.kind === 'EDIT_SCENARIO_EVENT') {
      expect(edit.action.targetEventId).toBe(ids[1]);
    }

    const del = validateAction({ kind: 'DELETE_SCENARIO_EVENT', ref: 1 }, ctxFor());
    expect(del.ok).toBe(true);
    if (del.ok && del.action.kind === 'DELETE_SCENARIO_EVENT') {
      expect(del.action.targetEventId).toBe(ids[0]);
    }
  });
});
