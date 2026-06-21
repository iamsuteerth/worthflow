import { usePlannerStore } from '@/store/plannerStore';
import { resolveAccountName } from '@/ai/actions/validateAction';
import { checkFeasibility } from '@/ai/actions/checkFeasibility';
import { buildEditChanges } from '@/ai/actions/editMapping';
import type { RuntimeEvent } from '@/types/runtimeEvent';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// ---------------------------------------------------------------------------
// applyAction — layer 2 of the two-layer defence (PHASE2.dev.md §4).
//
// Maps a validated action onto the EXACT guarded store methods the Scenario Lab
// uses. It first gates on checkFeasibility (so it never calls the store with an
// impossible op), then performs the op, then verifies the store actually changed
// (the final backstop). Undoable additions return their single runtime-event id;
// create-account / edit / delete have no one-click undo (revert by loading a save).
// ---------------------------------------------------------------------------

export type ApplyActionResult =
  | { ok: true; eventId?: string }
  | { ok: false; message: string };

function eventIds(events: RuntimeEvent[] | undefined): Set<string> {
  return new Set((events ?? []).map((e) => e.id));
}

// Resolve an account name to an id against the live plan (fail-closed).
function resolveId(accountName: string): { ok: true; id: string } | { ok: false; message: string } {
  const accounts = usePlannerStore.getState().config.investments.accounts;
  const resolved = resolveAccountName(accountName, accounts.map((a) => a.name));
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const id = accounts.find((a) => a.name === resolved.name)?.id;
  if (!id) return { ok: false, message: `I couldn't find an account named "${accountName}".` };
  return { ok: true, id };
}

export function applyAction(action: ResolvedProposedAction): ApplyActionResult {
  // Gate: the action must be possible against the live plan.
  const feasible = checkFeasibility(action);
  if (!feasible.feasible) return { ok: false, message: feasible.reason };

  const store = usePlannerStore.getState();

  // ---- create-account / edit / delete: no single undoable runtime event ----
  if (action.kind === 'CREATE_INVESTMENT_ACCOUNT') {
    const id = store.createInvestmentAccount({
      name: action.name,
      startMonth: action.startMonth,
      openingBalance: action.openingBalance,
      defaultMonthlyContribution: action.defaultMonthlyContribution,
      defaultAnnualReturn: action.defaultAnnualReturn,
    });
    return id ? { ok: true } : { ok: false, message: "That account couldn't be created as proposed." };
  }

  if (action.kind === 'EDIT_SCENARIO_EVENT') {
    const ev = (store.overrides.runtimeEvents ?? []).find((e) => e.id === action.targetEventId);
    if (!ev) return { ok: false, message: 'That change no longer exists.' };
    const changes = buildEditChanges(ev, action);
    if (Object.keys(changes).length === 0) {
      return { ok: false, message: "That change doesn't have a field I can edit that way." };
    }
    store.updateRuntimeEvent(action.targetEventId, changes);
    return { ok: true };
  }

  if (action.kind === 'DELETE_SCENARIO_EVENT') {
    const exists = (store.overrides.runtimeEvents ?? []).some((e) => e.id === action.targetEventId);
    if (!exists) return { ok: false, message: 'That change no longer exists.' };
    store.deleteRuntimeEvent(action.targetEventId);
    return { ok: true };
  }

  // ---- undoable additions: one new runtime event ----
  const before = eventIds(store.overrides.runtimeEvents);

  switch (action.kind) {
    case 'ADD_ONE_OFF_EXPENSE':
      store.addTransientOneOffExpense(action.month, action.amount, action.label);
      break;
    case 'ADD_CREDIT_CARD_EXPENSE':
      store.addTransientCreditCardExpense(action.month, action.amount, action.label);
      break;
    case 'ADD_RECURRING_EXPENSE':
      store.addTransientRecurringExpense(action.name, action.amount, action.startMonth, action.endMonth, action.frequency);
      break;
    case 'ADD_BONUS_INCOME':
      store.addTransientBonusIncome(action.month, action.amount, action.description);
      break;
    case 'ADD_SALARY_CHANGE':
      store.addTransientSalaryChange(action.effectiveMonth, action.newMonthlyIncome, action.description);
      break;
    case 'ADD_SPENDING_OVERRIDE':
      store.addTransientSpendingOverride(action.startMonth, action.endMonth, action.amount);
      break;
    case 'SET_OPENING_CASH_OVERRIDE':
      store.addTransientOpeningCashOverride(action.amount);
      break;
    case 'ADD_FD':
      store.addTransientFd(action.month, action.principal, action.rate, action.durationMonths, action.name);
      break;
    case 'ADD_RD':
      store.addTransientRd(action.month, action.monthlyContribution, action.rate, action.durationMonths, action.name);
      break;
    case 'ADD_INVESTMENT_DEPOSIT': {
      const r = resolveId(action.accountName);
      if (!r.ok) return r;
      store.addTransientInvestmentDeposit(r.id, action.month, action.amount);
      break;
    }
    case 'ADD_INVESTMENT_WITHDRAWAL': {
      const r = resolveId(action.accountName);
      if (!r.ok) return r;
      store.addTransientInvestmentWithdrawal(r.id, action.month, action.amount);
      break;
    }
    case 'ADD_ACCOUNT_AMOUNT_OVERRIDE': {
      const r = resolveId(action.accountName);
      if (!r.ok) return r;
      store.addTransientAccountAmountOverride(r.id, action.startMonth, action.endMonth, action.amount);
      break;
    }
    case 'ADD_ACCOUNT_RETURN_OVERRIDE': {
      const r = resolveId(action.accountName);
      if (!r.ok) return r;
      store.addTransientAccountReturnOverride(r.id, action.startMonth, action.endMonth, action.annualReturn);
      break;
    }
  }

  const after = usePlannerStore.getState().overrides.runtimeEvents ?? [];
  const added = after.filter((e) => !before.has(e.id));
  if (added.length === 0) {
    return { ok: false, message: "That change couldn't be applied as proposed." };
  }
  return { ok: true, eventId: added[0].id };
}
