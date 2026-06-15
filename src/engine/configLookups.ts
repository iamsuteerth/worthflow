// src/engine/configLookups.ts
import type { PlannerConfig } from "@/types/config";
import type { RecurringExpense } from "@/types/recurringExpense";
import type { MonthKey } from "@/types/simulation";

/**
 * Shared by getRecurringExpense (cash effect) and buildCashflowEvents (display)
 * so the two never drift on when a recurring expense is "active" for a month.
 */
export function isRecurringExpenseActive(
  re: RecurringExpense,
  month: MonthKey
): boolean {
  if (month < re.startMonth || month > re.endMonth) return false;

  if ((re.frequency ?? "MONTHLY") === "ANNUAL") {
    return month.slice(5) === re.startMonth.slice(5);
  }

  return true;
}

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

/**
 * Returns the total recurring expense amount for a given month.
 * Includes all recurring expenses whose range covers this month.
 */
export function getRecurringExpense(
  config: PlannerConfig,
  month: MonthKey
): number {
  return (config.recurringExpenses ?? [])
    .filter((re) => isRecurringExpenseActive(re, month))
    .reduce((sum, re) => sum + re.amount, 0);
}

export function getMonthlyIncome(
  config: PlannerConfig,
  month: MonthKey
): number {
  const applicableChanges = config.salaryChanges
    .filter((change) => change.effectiveMonth <= month)
    .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));

  if (applicableChanges.length === 0) {
    return config.income.monthly;
  }

  return applicableChanges[applicableChanges.length - 1].newMonthlyIncome;
}

export function getBonusIncome(
  config: PlannerConfig,
  month: MonthKey
): number {
  return config.bonusIncome
    .filter((bonus) => bonus.month === month)
    .reduce((sum, bonus) => sum + bonus.amount, 0);
}