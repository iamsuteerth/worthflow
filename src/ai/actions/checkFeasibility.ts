import {
  usePlannerStore,
  getAvailableCash,
  getAccountValueAtMonth,
} from '@/store/plannerStore';
import { buildEffectiveConfig } from '@/engine/buildEffectiveConfig';
import { money } from '@/format/money';
import { formatMonth } from '@/engine/monthFormatting';
import { resolveAccountName } from '@/ai/actions/validateAction';
import { buildEditChanges } from '@/ai/actions/editMapping';
import type {
  RuntimeEvent,
  RuntimeSpendingOverride,
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
} from '@/types/runtimeEvent';
import type { MonthKey } from '@/types/simulation';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// ---------------------------------------------------------------------------
// checkFeasibility — layer 1.5 (PHASE2.dev.md §4 / §6 "pre-flag impossibility").
//
// Decides, against the LIVE plan, whether an applied action would actually take
// effect — replicating the same caps the Scenario Lab forms enforce (available
// cash, account balance, override overlap, an account's start month, edit caps).
// Used to PRE-FLAG the preview card (disable Apply with a reason) and to gate
// applyAction so the AI never even calls the store with an impossible op. It
// never mutates anything.
// ---------------------------------------------------------------------------

export type FeasibilityResult = { feasible: true } | { feasible: false; reason: string };

const ok: FeasibilityResult = { feasible: true };
const no = (reason: string): FeasibilityResult => ({ feasible: false, reason });

function overlaps(
  startMonth: MonthKey,
  endMonth: MonthKey,
  ranges: { startMonth: MonthKey; endMonth: MonthKey }[],
): boolean {
  return ranges.some((r) => !(endMonth < r.startMonth || startMonth > r.endMonth));
}

export function checkFeasibility(action: ResolvedProposedAction): FeasibilityResult {
  const s = usePlannerStore.getState();
  const { config, overrides, baseConfig } = s;
  const accounts = config.investments.accounts;
  const events = overrides.runtimeEvents ?? [];

  switch (action.kind) {
    // Pure additions with no cash/overlap cap — always feasible once in-window.
    case 'ADD_ONE_OFF_EXPENSE':
    case 'ADD_CREDIT_CARD_EXPENSE':
    case 'ADD_BONUS_INCOME':
    case 'ADD_SALARY_CHANGE':
    case 'ADD_RECURRING_EXPENSE':
    case 'SET_OPENING_CASH_OVERRIDE':
      return ok;

    case 'ADD_SPENDING_OVERRIDE': {
      const existing = events.filter((e): e is RuntimeSpendingOverride => e.type === 'SPENDING_OVERRIDE');
      if (overlaps(action.startMonth, action.endMonth, existing)) {
        return no('That period overlaps an existing spending override. Spending overrides cannot overlap.');
      }
      return ok;
    }

    case 'ADD_FD':
    case 'ADD_RD': {
      const cap = getAvailableCash(config, overrides, action.month);
      const amount = action.kind === 'ADD_FD' ? action.principal : action.monthlyContribution;
      if (amount > cap) {
        return no(`Not enough available cash in ${formatMonth(action.month)} — only ${money(cap)} is free then.`);
      }
      return ok;
    }

    case 'ADD_INVESTMENT_DEPOSIT': {
      const acct = resolveAcct(action.accountName, accounts);
      if (!acct.ok) return no(acct.reason);
      if (action.month < acct.account.startMonth) {
        return no(`That month is before ${acct.account.name} starts (${formatMonth(acct.account.startMonth)}).`);
      }
      const cap = getAvailableCash(config, overrides, action.month);
      if (action.amount > cap) {
        return no(`Not enough available cash in ${formatMonth(action.month)} — only ${money(cap)} is free then.`);
      }
      return ok;
    }

    case 'ADD_INVESTMENT_WITHDRAWAL': {
      const acct = resolveAcct(action.accountName, accounts);
      if (!acct.ok) return no(acct.reason);
      if (action.month < acct.account.startMonth) {
        return no(`That month is before ${acct.account.name} starts (${formatMonth(acct.account.startMonth)}).`);
      }
      const cap = getAccountValueAtMonth(config, overrides, acct.account.id, action.month);
      if (action.amount > cap) {
        return no(`${acct.account.name} only holds ${money(cap)} in ${formatMonth(action.month)} — can't withdraw more.`);
      }
      return ok;
    }

    case 'CREATE_INVESTMENT_ACCOUNT': {
      if (action.startMonth > config.forecast.startMonth) {
        const cap = getAvailableCash(config, overrides, action.startMonth);
        if (action.openingBalance > cap) {
          return no(`A future-dated account's opening balance is funded from cash — only ${money(cap)} is free in ${formatMonth(action.startMonth)}.`);
        }
      }
      return ok;
    }

    case 'ADD_ACCOUNT_AMOUNT_OVERRIDE': {
      const acct = resolveAcct(action.accountName, accounts);
      if (!acct.ok) return no(acct.reason);
      if (action.startMonth < acct.account.startMonth) {
        return no(`The override can't start before ${acct.account.name} starts (${formatMonth(acct.account.startMonth)}).`);
      }
      const existing = events.filter(
        (e): e is RuntimeAccountAmountOverride =>
          e.type === 'ACCOUNT_AMOUNT_OVERRIDE' && e.accountId === acct.account.id,
      );
      if (overlaps(action.startMonth, action.endMonth, existing)) {
        return no(`${acct.account.name} already has a contribution override over part of that range.`);
      }
      return ok;
    }

    case 'ADD_ACCOUNT_RETURN_OVERRIDE': {
      const acct = resolveAcct(action.accountName, accounts);
      if (!acct.ok) return no(acct.reason);
      if (action.startMonth < acct.account.startMonth) {
        return no(`The override can't start before ${acct.account.name} starts (${formatMonth(acct.account.startMonth)}).`);
      }
      const existing = events.filter(
        (e): e is RuntimeAccountReturnOverride =>
          e.type === 'ACCOUNT_RETURN_OVERRIDE' && e.accountId === acct.account.id,
      );
      if (overlaps(action.startMonth, action.endMonth, existing)) {
        return no(`${acct.account.name} already has a return override over part of that range.`);
      }
      return ok;
    }

    case 'DELETE_SCENARIO_EVENT': {
      const ev = events.find((e) => e.id === action.targetEventId);
      return ev ? ok : no('That change no longer exists.');
    }

    case 'EDIT_SCENARIO_EVENT':
      return checkEditFeasibility(action, events, baseConfig, overrides);
  }
}

function resolveAcct(
  name: string,
  accounts: { id: string; name: string; startMonth: MonthKey }[],
): { ok: true; account: { id: string; name: string; startMonth: MonthKey } } | { ok: false; reason: string } {
  const r = resolveAccountName(name, accounts.map((a) => a.name));
  if (!r.ok) return { ok: false, reason: r.message };
  const account = accounts.find((a) => a.name === r.name);
  if (!account) return { ok: false, reason: `I couldn't find an account named "${name}".` };
  return { ok: true, account };
}

function checkEditFeasibility(
  action: Extract<ResolvedProposedAction, { kind: 'EDIT_SCENARIO_EVENT' }>,
  events: RuntimeEvent[],
  baseConfig: ReturnType<typeof usePlannerStore.getState>['baseConfig'],
  overrides: ReturnType<typeof usePlannerStore.getState>['overrides'],
): FeasibilityResult {
  const ev = events.find((e) => e.id === action.targetEventId);
  if (!ev) return no('That change no longer exists.');

  const changes = buildEditChanges(ev, action);
  if (Object.keys(changes).length === 0) {
    return no("That change doesn't have a field I can edit that way.");
  }

  // Amount sign rules, matching the creation forms.
  if (action.amount !== undefined) {
    if (ev.type === 'OPENING_CASH_OVERRIDE') {
      // any value allowed
    } else if (ev.type === 'SPENDING_OVERRIDE' || ev.type === 'ACCOUNT_AMOUNT_OVERRIDE') {
      if (action.amount < 0) return no('Amount cannot be negative.');
    } else if (ev.type === 'SALARY_CHANGE') {
      if (action.amount < 0) return no('A salary cannot be negative.');
    } else if (action.amount <= 0) {
      return no('Amount must be greater than zero.');
    }
  }

  // Cash / balance caps, measured with THIS event removed (mirrors the edit modal).
  if (ev.type === 'FD' || ev.type === 'RD' || ev.type === 'INVESTMENT_DEPOSIT' || ev.type === 'INVESTMENT_WITHDRAWAL') {
    const month: MonthKey =
      action.month ?? (ev.type === 'FD' || ev.type === 'RD' ? ev.startMonth : ev.month);

    const others = events.filter((e) => e.id !== ev.id);
    const without = { ...overrides, runtimeEvents: others };
    const cfg = buildEffectiveConfig(baseConfig, without);

    const newAmount =
      action.amount ??
      (ev.type === 'FD' ? ev.principal : ev.type === 'RD' ? ev.monthlyContribution : ev.amount);

    if (ev.type === 'INVESTMENT_WITHDRAWAL') {
      const acct = baseConfig.investments.accounts.find((a) => a.id === ev.accountId);
      if (acct && month < acct.startMonth) {
        return no(`That month is before ${acct.name} starts (${formatMonth(acct.startMonth)}).`);
      }
      const cap = getAccountValueAtMonth(cfg, without, ev.accountId, month);
      if (newAmount > cap) {
        return no(`That account only holds ${money(cap)} in ${formatMonth(month)} — can't withdraw more.`);
      }
    } else {
      if (ev.type === 'INVESTMENT_DEPOSIT') {
        const acct = baseConfig.investments.accounts.find((a) => a.id === ev.accountId);
        if (acct && month < acct.startMonth) {
          return no(`That month is before ${acct.name} starts (${formatMonth(acct.startMonth)}).`);
        }
      }
      const cap = getAvailableCash(cfg, without, month);
      if (newAmount > cap) {
        return no(`Not enough available cash in ${formatMonth(month)} — only ${money(cap)} is free then.`);
      }
    }
  }

  return ok;
}
