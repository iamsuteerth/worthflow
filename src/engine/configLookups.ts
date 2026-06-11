import type { PlannerConfig } from "../types/config";
import type { MonthKey } from "../types/simulation";

export function getMonthlyExpense(
  config: PlannerConfig,
  month: MonthKey
): number {
  return (
    config.expenses.overrides[month] ??
    config.expenses.defaultMonthly
  );
}

export function getCreditCardExpense(
  config: PlannerConfig,
  month: MonthKey
): number {
  return (
    config.creditCardBills.find(
      (bill) => bill.month === month
    )?.amount ?? 0
  );
}

export function getOneOffExpense(
  config: PlannerConfig,
  month: MonthKey
): number {
  return config.oneOffExpenses
    .filter((expense) => expense.month === month)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function getInvestmentAmount(
  config: PlannerConfig,
  month: MonthKey
): number {
  return (
    config.investments.schedule[month] ?? 0
  );
}

export function getMonthlyIncome(
  config: PlannerConfig,
  month: MonthKey
): number {
  const applicableChanges =
    config.salaryChanges
      .filter(
        (change) =>
          change.effectiveMonth <=
          month
      )
      .sort((a, b) =>
        a.effectiveMonth.localeCompare(
          b.effectiveMonth
        )
      );

  if (
    applicableChanges.length === 0
  ) {
    return config.income.monthly;
  }

  return applicableChanges[
    applicableChanges.length - 1
  ].newMonthlyIncome;
}

export function getBonusIncome(
  config: PlannerConfig,
  month: MonthKey
): number {
  return config.bonusIncome
    .filter(
      (bonus) =>
        bonus.month === month
    )
    .reduce(
      (sum, bonus) =>
        sum + bonus.amount,
      0
    );
}