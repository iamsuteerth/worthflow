import type { RuntimeEvent } from '@/types/runtimeEvent';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

type EditAction = Extract<ResolvedProposedAction, { kind: 'EDIT_SCENARIO_EVENT' }>;

// Map an EDIT_SCENARIO_EVENT's generic fields onto the target event's own field
// names, keeping ONLY the fields that actually apply to that event type (mirrors
// what the Scenario Lab's edit modal allows). Returns the Partial passed to
// updateRuntimeEvent; an empty object means "nothing applicable to change".
//
// Shared by applyAction (to perform the edit) and checkFeasibility (to know
// applicability and the post-edit values) so the two never disagree.
export function buildEditChanges(event: RuntimeEvent, action: EditAction): Partial<RuntimeEvent> {
  const c: Record<string, unknown> = {};
  const { amount, month, rate, durationMonths, annualReturn } = action;

  switch (event.type) {
    case 'ONE_OFF_EXPENSE':
    case 'CREDIT_CARD_EXPENSE':
      if (amount !== undefined) c.amount = amount;
      if (month !== undefined) c.month = month;
      break;
    case 'BONUS_INCOME':
      if (amount !== undefined) c.amount = amount;
      if (month !== undefined) c.month = month;
      break;
    case 'INVESTMENT_DEPOSIT':
    case 'INVESTMENT_WITHDRAWAL':
      if (amount !== undefined) c.amount = amount;
      if (month !== undefined) c.month = month;
      break;
    case 'RECURRING_EXPENSE':
    case 'ACCOUNT_AMOUNT_OVERRIDE':
    case 'SPENDING_OVERRIDE':
    case 'OPENING_CASH_OVERRIDE':
      if (amount !== undefined) c.amount = amount;
      break;
    case 'SALARY_CHANGE':
      if (amount !== undefined) c.newMonthlyIncome = amount;
      if (month !== undefined) c.effectiveMonth = month;
      break;
    case 'ACCOUNT_RETURN_OVERRIDE':
      if (annualReturn !== undefined) c.annualReturn = annualReturn;
      break;
    case 'FD':
      if (amount !== undefined) c.principal = amount;
      if (rate !== undefined) c.rate = rate;
      if (durationMonths !== undefined) c.durationMonths = durationMonths;
      if (month !== undefined) c.startMonth = month;
      break;
    case 'RD':
      if (amount !== undefined) c.monthlyContribution = amount;
      if (rate !== undefined) c.rate = rate;
      if (durationMonths !== undefined) c.durationMonths = durationMonths;
      if (month !== undefined) c.startMonth = month;
      break;
  }
  return c as Partial<RuntimeEvent>;
}
