import type { MonthKey } from '@/types/simulation';

import { proposedActionSchema, type ResolvedProposedAction } from '@/ai/actions/actionSchema';
import { isValidAnnualRange } from '@/engine/annualExpense';
import { generateMonths } from '@/engine/dateUtils';

// ---------------------------------------------------------------------------
// validateAction — layer 1 of the two-layer defence.
//
// Takes untrusted JSON from the model + the live forecast context, and either
// returns a well-formed, in-window, ref-resolved action or a single
// INVALID_ACTION reason. It NEVER partially applies and NEVER touches the store.
// Plan-relative feasibility (available cash, account balance, overlap, an
// account's start month, edit caps) is layer 1.5 — see checkFeasibility.ts —
// and the store guards are the final backstop.
// ---------------------------------------------------------------------------

export interface ActionValidationContext {
  startMonth: MonthKey;
  totalMonths: number;
  /** Names of investment accounts that currently exist (for account-targeted actions). */
  accountNames: string[];
  /**
   * Runtime-event ids in the SAME order as the forecast's `scenarioChanges`
   * list, so a 1-based `ref` resolves to a concrete event id app-side. The id
   * never reaches the model.
   */
  scenarioEventIds: string[];
}

export type ValidateActionResult =
  | { ok: true; action: ResolvedProposedAction }
  | { ok: false; message: string };

const GENERIC_INVALID =
  "I couldn't form a valid suggestion. Try rephrasing what you'd like to change.";

function inWindow(month: MonthKey, windowSet: Set<string>): boolean {
  return windowSet.has(month);
}

// Resolve a proposed account name to exactly one existing account, failing
// closed on unknown or ambiguous matches (case-insensitive only when unique).
export function resolveAccountName(
  accountName: string,
  accountNames: string[],
): { ok: true; name: string } | { ok: false; message: string } {
  const trimmed = accountName.trim();
  const exact = accountNames.filter((n) => n === trimmed);
  if (exact.length === 1) return { ok: true, name: exact[0] };
  if (exact.length > 1) {
    return { ok: false, message: `More than one account is named "${trimmed}". Please be more specific.` };
  }
  const ci = accountNames.filter((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (ci.length === 1) return { ok: true, name: ci[0] };
  if (ci.length > 1) {
    return { ok: false, message: `More than one account matches "${trimmed}". Please be more specific.` };
  }
  return { ok: false, message: `I couldn't find an account named "${trimmed}".` };
}

export function validateAction(
  json: unknown,
  ctx: ActionValidationContext,
): ValidateActionResult {
  const parsed = proposedActionSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: GENERIC_INVALID };
  }
  const action = parsed.data;

  const months = generateMonths(ctx.startMonth, ctx.totalMonths);
  const windowSet = new Set<string>(months);
  const lastMonth = months[months.length - 1];
  const outOfWindow = `That month is outside your forecast window (${ctx.startMonth} to ${lastMonth}).`;
  const badRange = 'The start month must not be after the end month.';

  switch (action.kind) {
    case 'ADD_ONE_OFF_EXPENSE':
    case 'ADD_CREDIT_CARD_EXPENSE':
    case 'ADD_BONUS_INCOME':
    case 'ADD_FD':
    case 'ADD_RD': {
      if (!inWindow(action.month, windowSet)) return { ok: false, message: outOfWindow };
      return { ok: true, action };
    }

    case 'ADD_SALARY_CHANGE': {
      if (!inWindow(action.effectiveMonth, windowSet)) return { ok: false, message: outOfWindow };
      return { ok: true, action };
    }

    case 'ADD_SPENDING_OVERRIDE': {
      if (!inWindow(action.startMonth, windowSet) || !inWindow(action.endMonth, windowSet)) {
        return { ok: false, message: outOfWindow };
      }
      if (action.startMonth > action.endMonth) return { ok: false, message: badRange };
      return { ok: true, action };
    }

    case 'ADD_RECURRING_EXPENSE': {
      if (!inWindow(action.startMonth, windowSet) || !inWindow(action.endMonth, windowSet)) {
        return { ok: false, message: outOfWindow };
      }
      if (action.startMonth > action.endMonth) return { ok: false, message: badRange };
      if (
        action.frequency === 'ANNUAL' &&
        !isValidAnnualRange(ctx.startMonth, ctx.totalMonths, action.startMonth, action.endMonth)
      ) {
        return {
          ok: false,
          message: 'An annual recurring expense needs a whole number of years inside the forecast.',
        };
      }
      return { ok: true, action };
    }

    case 'SET_OPENING_CASH_OVERRIDE':
      // No month to check; negatives are intentionally allowed.
      return { ok: true, action };

    case 'ADD_INVESTMENT_DEPOSIT':
    case 'ADD_INVESTMENT_WITHDRAWAL': {
      if (!inWindow(action.month, windowSet)) return { ok: false, message: outOfWindow };
      const resolved = resolveAccountName(action.accountName, ctx.accountNames);
      if (!resolved.ok) return { ok: false, message: resolved.message };
      return { ok: true, action };
    }

    case 'CREATE_INVESTMENT_ACCOUNT': {
      if (!inWindow(action.startMonth, windowSet)) return { ok: false, message: outOfWindow };
      return { ok: true, action };
    }

    case 'ADD_ACCOUNT_AMOUNT_OVERRIDE':
    case 'ADD_ACCOUNT_RETURN_OVERRIDE': {
      if (!inWindow(action.startMonth, windowSet) || !inWindow(action.endMonth, windowSet)) {
        return { ok: false, message: outOfWindow };
      }
      if (action.startMonth > action.endMonth) return { ok: false, message: badRange };
      const resolved = resolveAccountName(action.accountName, ctx.accountNames);
      if (!resolved.ok) return { ok: false, message: resolved.message };
      return { ok: true, action };
    }

    case 'EDIT_SCENARIO_EVENT': {
      const targetEventId = ctx.scenarioEventIds[action.ref - 1];
      if (!targetEventId) {
        return { ok: false, message: `There's no active change numbered ${action.ref} to edit.` };
      }
      if (action.month !== undefined && !inWindow(action.month, windowSet)) {
        return { ok: false, message: outOfWindow };
      }
      return { ok: true, action: { ...action, targetEventId } };
    }

    case 'DELETE_SCENARIO_EVENT': {
      const targetEventId = ctx.scenarioEventIds[action.ref - 1];
      if (!targetEventId) {
        return { ok: false, message: `There's no active change numbered ${action.ref} to remove.` };
      }
      return { ok: true, action: { ...action, targetEventId } };
    }
  }
}
