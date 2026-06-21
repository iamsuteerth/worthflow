import { usePlannerStore } from '@/store/plannerStore';
import { buildEffectiveConfig } from '@/engine/buildEffectiveConfig';
import { simulate } from '@/engine/simulate';
import { resolveAccountName } from '@/ai/actions/validateAction';
import { buildEditChanges } from '@/ai/actions/editMapping';
import type { RuntimeEvent } from '@/types/runtimeEvent';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// ---------------------------------------------------------------------------
// dryRun — the trust-builder preview (PHASE2.dev.md §6).
//
// Runs simulate() on a CLONE of (base plan + the proposed action) and reports a
// headline delta. Purely informational; it NEVER mutates the live store. Unlike
// Apply it does not run the store guards — checkFeasibility handles "is this
// allowed"; dryRun answers "what would this do".
// ---------------------------------------------------------------------------

export interface DryRunDelta {
  lowestCashBefore: number;
  lowestCashAfter: number;
  finalNetWorthBefore: number;
  finalNetWorthAfter: number;
}

function resolveAccountId(accountName: string, accounts: { id: string; name: string }[]): string | null {
  const r = resolveAccountName(accountName, accounts.map((a) => a.name));
  if (!r.ok) return null;
  return accounts.find((a) => a.name === r.name)?.id ?? null;
}

// Build the engine-shaped runtime event for an additive action (mirrors the
// shapes plannerStore's addTransient* methods construct).
function additionEvent(
  action: ResolvedProposedAction,
  accounts: { id: string; name: string }[],
): RuntimeEvent | null {
  const id = crypto.randomUUID();
  switch (action.kind) {
    case 'ADD_ONE_OFF_EXPENSE':
      return { id, type: 'ONE_OFF_EXPENSE', month: action.month, amount: action.amount, label: action.label };
    case 'ADD_CREDIT_CARD_EXPENSE':
      return { id, type: 'CREDIT_CARD_EXPENSE', month: action.month, amount: action.amount, label: action.label };
    case 'ADD_RECURRING_EXPENSE':
      return { id, type: 'RECURRING_EXPENSE', name: action.name, amount: action.amount, startMonth: action.startMonth, endMonth: action.endMonth, frequency: action.frequency };
    case 'ADD_BONUS_INCOME':
      return { id, type: 'BONUS_INCOME', month: action.month, amount: action.amount, description: action.description };
    case 'ADD_SALARY_CHANGE':
      return { id, type: 'SALARY_CHANGE', effectiveMonth: action.effectiveMonth, newMonthlyIncome: action.newMonthlyIncome, description: action.description };
    case 'ADD_SPENDING_OVERRIDE':
      return { id, type: 'SPENDING_OVERRIDE', startMonth: action.startMonth, endMonth: action.endMonth, amount: action.amount };
    case 'SET_OPENING_CASH_OVERRIDE':
      return { id, type: 'OPENING_CASH_OVERRIDE', amount: action.amount };
    case 'ADD_FD':
      return { id, type: 'FD', name: action.name, principal: action.principal, rate: action.rate, startMonth: action.month, durationMonths: action.durationMonths };
    case 'ADD_RD':
      return { id, type: 'RD', name: action.name, monthlyContribution: action.monthlyContribution, rate: action.rate, startMonth: action.month, durationMonths: action.durationMonths };
    case 'ADD_INVESTMENT_DEPOSIT': {
      const accountId = resolveAccountId(action.accountName, accounts);
      return accountId ? { id, type: 'INVESTMENT_DEPOSIT', accountId, month: action.month, amount: action.amount } : null;
    }
    case 'ADD_INVESTMENT_WITHDRAWAL': {
      const accountId = resolveAccountId(action.accountName, accounts);
      return accountId ? { id, type: 'INVESTMENT_WITHDRAWAL', accountId, month: action.month, amount: action.amount } : null;
    }
    case 'ADD_ACCOUNT_AMOUNT_OVERRIDE': {
      const accountId = resolveAccountId(action.accountName, accounts);
      return accountId ? { id, type: 'ACCOUNT_AMOUNT_OVERRIDE', accountId, startMonth: action.startMonth, endMonth: action.endMonth, amount: action.amount } : null;
    }
    case 'ADD_ACCOUNT_RETURN_OVERRIDE': {
      const accountId = resolveAccountId(action.accountName, accounts);
      return accountId ? { id, type: 'ACCOUNT_RETURN_OVERRIDE', accountId, startMonth: action.startMonth, endMonth: action.endMonth, annualReturn: action.annualReturn } : null;
    }
    default:
      return null;
  }
}

// Produce the candidate (baseConfig, overrides) pair the action would yield.
function buildCandidate(
  action: ResolvedProposedAction,
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides,
  accounts: { id: string; name: string }[],
): { base: PlannerConfig; ov: PlannerOverrides } | null {
  const events = overrides.runtimeEvents ?? [];

  if (action.kind === 'CREATE_INVESTMENT_ACCOUNT') {
    const base = structuredClone(baseConfig);
    base.investments.accounts.push({
      id: crypto.randomUUID(),
      name: action.name,
      startMonth: action.startMonth,
      openingBalance: action.openingBalance,
      defaultAnnualReturn: action.defaultAnnualReturn,
      defaultMonthlyContribution: action.defaultMonthlyContribution,
    });
    return { base, ov: overrides };
  }

  if (action.kind === 'EDIT_SCENARIO_EVENT') {
    const ev = events.find((e) => e.id === action.targetEventId);
    if (!ev) return null;
    const changes = buildEditChanges(ev, action);
    if (Object.keys(changes).length === 0) return null;
    const newEvents = events.map((e) => (e.id === action.targetEventId ? ({ ...e, ...changes } as RuntimeEvent) : e));
    return { base: baseConfig, ov: { ...overrides, runtimeEvents: newEvents } };
  }

  if (action.kind === 'DELETE_SCENARIO_EVENT') {
    const newEvents = events.filter((e) => e.id !== action.targetEventId);
    return { base: baseConfig, ov: { ...overrides, runtimeEvents: newEvents } };
  }

  const ev = additionEvent(action, accounts);
  if (!ev) return null;
  const filtered =
    ev.type === 'OPENING_CASH_OVERRIDE' ? events.filter((e) => e.type !== 'OPENING_CASH_OVERRIDE') : events;
  return { base: baseConfig, ov: { ...overrides, runtimeEvents: [...filtered, ev] } };
}

export function dryRun(action: ResolvedProposedAction): DryRunDelta | null {
  const store = usePlannerStore.getState();
  const accounts = store.config.investments.accounts;

  const candidate = buildCandidate(action, store.baseConfig, store.overrides, accounts);
  if (!candidate) return null;

  const baseline = simulate(store.config, store.overrides);
  const after = simulate(buildEffectiveConfig(candidate.base, candidate.ov), candidate.ov);

  return {
    lowestCashBefore: Math.round(baseline.summary.lowestBalance),
    lowestCashAfter: Math.round(after.summary.lowestBalance),
    finalNetWorthBefore: Math.round(baseline.summary.finalNetWorth),
    finalNetWorthAfter: Math.round(after.summary.finalNetWorth),
  };
}
