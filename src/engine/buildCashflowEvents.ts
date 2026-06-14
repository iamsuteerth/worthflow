import type {
  PlannerConfig,
} from "@/types/config";

import type {
  FinancialEvent,
} from "@/types/events";

import type {
  MonthKey,
} from "@/types/simulation";

export function buildCashflowEvents(
  config: PlannerConfig,
  month: MonthKey
): FinancialEvent[] {
  const events: FinancialEvent[] = [];
  config.oneOffExpenses
    .filter(
      (expense) =>
        expense.month === month
    )
    .forEach((expense) => {
      events.push({
        id: expense.id,

        month,

        type:
          "ONE_OFF_EXPENSE",

        amount:
          expense.amount,

        description:
          expense.label,
      });
    });
  config.creditCardBills
    .filter(
      (bill) =>
        bill.month === month
    )
    .forEach((bill) => {
      events.push({
        id: bill.id,

        month,

        type:
          "CREDIT_CARD_EXPENSE",

        amount:
          bill.amount,

        description:
          bill.label
      });
    });
  config.bonusIncome
    .filter(
      (bonus) =>
        bonus.month === month
    )
    .forEach((bonus) => {
      events.push({
        id: bonus.id,

        month,

        type:
          "BONUS_INCOME",

        amount:
          bonus.amount,

        description:
          bonus.description,
      });
    });
  config.salaryChanges
    .filter(
      (change) =>
        change.effectiveMonth ===
        month
    )
    .forEach((change) => {
      events.push({
        id: change.id,

        month,

        type:
          "SALARY_CHANGE",

        amount:
          change.newMonthlyIncome,

        description:
          change.description,
      });
    });
  return events;
}