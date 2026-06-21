import { money } from '@/format/money';
import { formatMonth } from '@/engine/monthFormatting';
import { usePlannerStore } from '@/store/plannerStore';
import type { RuntimeEvent } from '@/types/runtimeEvent';
import type { InvestmentAccount } from '@/types/investmentAccount';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// Compact plain-language description of an existing runtime event (for edit/delete
// previews). Mirrors the Scenario Lab's event list wording.
function describeRuntimeEvent(event: RuntimeEvent, accounts: InvestmentAccount[]): string {
  const acct = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'account';
  switch (event.type) {
    case 'ONE_OFF_EXPENSE':
      return `one-off expense ${money(event.amount)} in ${formatMonth(event.month)} (${event.label})`;
    case 'CREDIT_CARD_EXPENSE':
      return `credit-card payment ${money(event.amount)} in ${formatMonth(event.month)} (${event.label})`;
    case 'RECURRING_EXPENSE':
      return `recurring expense "${event.name}" ${money(event.amount)}${event.frequency === 'ANNUAL' ? '/yr' : '/mo'}`;
    case 'BONUS_INCOME':
      return `bonus income ${money(event.amount)} in ${formatMonth(event.month)}`;
    case 'SALARY_CHANGE':
      return `salary change to ${money(event.newMonthlyIncome)}/mo from ${formatMonth(event.effectiveMonth)}`;
    case 'SPENDING_OVERRIDE':
      return `spending override ${money(event.amount)}/mo (${formatMonth(event.startMonth)}–${formatMonth(event.endMonth)})`;
    case 'OPENING_CASH_OVERRIDE':
      return `opening-cash override of ${money(event.amount)}`;
    case 'FD':
      return `FD "${event.name}" ${money(event.principal)} @ ${event.rate}%`;
    case 'RD':
      return `RD "${event.name}" ${money(event.monthlyContribution)}/mo @ ${event.rate}%`;
    case 'INVESTMENT_DEPOSIT':
      return `deposit ${money(event.amount)} into ${acct(event.accountId)} in ${formatMonth(event.month)}`;
    case 'INVESTMENT_WITHDRAWAL':
      return `withdrawal ${money(event.amount)} from ${acct(event.accountId)} in ${formatMonth(event.month)}`;
    case 'ACCOUNT_AMOUNT_OVERRIDE':
      return `contribution override ${money(event.amount)}/mo on ${acct(event.accountId)}`;
    case 'ACCOUNT_RETURN_OVERRIDE':
      return `return override ${event.annualReturn}% on ${acct(event.accountId)}`;
  }
}

function targetDescription(targetEventId: string): string {
  const state = usePlannerStore.getState();
  const event = (state.overrides.runtimeEvents ?? []).find((e) => e.id === targetEventId);
  if (!event) return 'that change';
  return describeRuntimeEvent(event, state.config.investments.accounts);
}

// Plain-language, en-IN one-liner for a proposed action — shown in the preview
// card and as the assistant message text. Names, not ids; rupees, not raw JSON.
export function describeAction(action: ResolvedProposedAction): string {
  switch (action.kind) {
    case 'ADD_ONE_OFF_EXPENSE':
      return `Add a one-off expense of ${money(action.amount)} in ${formatMonth(action.month)} (${action.label}).`;
    case 'ADD_CREDIT_CARD_EXPENSE':
      return `Add a credit-card payment of ${money(action.amount)} in ${formatMonth(action.month)} (${action.label}).`;
    case 'ADD_RECURRING_EXPENSE': {
      const cadence = action.frequency === 'MONTHLY' ? '/month' : '/year';
      return `Add a recurring expense "${action.name}" of ${money(action.amount)}${cadence} from ${formatMonth(action.startMonth)} to ${formatMonth(action.endMonth)}.`;
    }
    case 'ADD_BONUS_INCOME':
      return `Add bonus income of ${money(action.amount)} in ${formatMonth(action.month)} (${action.description}).`;
    case 'ADD_SALARY_CHANGE':
      return `Change monthly income to ${money(action.newMonthlyIncome)} from ${formatMonth(action.effectiveMonth)} (${action.description}).`;
    case 'ADD_SPENDING_OVERRIDE':
      return `Set monthly spending to ${money(action.amount)} from ${formatMonth(action.startMonth)} to ${formatMonth(action.endMonth)}.`;
    case 'SET_OPENING_CASH_OVERRIDE':
      return `Set the scenario's opening cash balance to ${money(action.amount)}.`;
    case 'ADD_FD':
      return `Create a Fixed Deposit "${action.name}" of ${money(action.principal)} at ${action.rate}% for ${action.durationMonths} months from ${formatMonth(action.month)}.`;
    case 'ADD_RD':
      return `Create a Recurring Deposit "${action.name}" of ${money(action.monthlyContribution)}/month at ${action.rate}% for ${action.durationMonths} months from ${formatMonth(action.month)}.`;
    case 'ADD_INVESTMENT_DEPOSIT':
      return `Deposit ${money(action.amount)} into ${action.accountName} in ${formatMonth(action.month)}.`;
    case 'ADD_INVESTMENT_WITHDRAWAL':
      return `Withdraw ${money(action.amount)} from ${action.accountName} in ${formatMonth(action.month)}.`;
    case 'CREATE_INVESTMENT_ACCOUNT': {
      const parts = [`opening ${money(action.openingBalance)}`];
      if (action.defaultMonthlyContribution > 0) parts.push(`${money(action.defaultMonthlyContribution)}/mo`);
      parts.push(`${action.defaultAnnualReturn}% return`);
      return `Create an investment account "${action.name}" (${parts.join(', ')}) from ${formatMonth(action.startMonth)}.`;
    }
    case 'ADD_ACCOUNT_AMOUNT_OVERRIDE':
      return `Set ${action.accountName}'s monthly contribution to ${money(action.amount)} from ${formatMonth(action.startMonth)} to ${formatMonth(action.endMonth)}.`;
    case 'ADD_ACCOUNT_RETURN_OVERRIDE':
      return `Set ${action.accountName}'s annual return to ${action.annualReturn}% from ${formatMonth(action.startMonth)} to ${formatMonth(action.endMonth)}.`;
    case 'EDIT_SCENARIO_EVENT': {
      const changes: string[] = [];
      if (action.amount !== undefined) changes.push(`amount to ${money(action.amount)}`);
      if (action.month !== undefined) changes.push(`month to ${formatMonth(action.month)}`);
      if (action.rate !== undefined) changes.push(`rate to ${action.rate}%`);
      if (action.durationMonths !== undefined) changes.push(`duration to ${action.durationMonths} months`);
      if (action.annualReturn !== undefined) changes.push(`return to ${action.annualReturn}%`);
      return `Edit ${targetDescription(action.targetEventId)} — set ${changes.join(', ')}.`;
    }
    case 'DELETE_SCENARIO_EVENT':
      return `Remove ${targetDescription(action.targetEventId)}.`;
  }
}
