import type { MonthKey } from "./simulation";

export interface RuntimeOneOffExpense {
  id: string;

  type: "ONE_OFF_EXPENSE";

  month: MonthKey;

  amount: number;

  label: string;
}

export interface RuntimeFixedDeposit {
  id: string;

  type: "FD";

  name: string;

  principal: number;

  rate: number;

  startMonth: MonthKey;

  durationMonths: number;
}

export interface RuntimeRecurringDeposit {
  id: string;

  type: "RD";

  name: string;

  monthlyContribution: number;

  rate: number;

  startMonth: MonthKey;

  durationMonths: number;
}

export interface RuntimeBonusIncome {
  id: string;

  type: "BONUS_INCOME";

  month: MonthKey;

  amount: number;

  description: string;
}

export interface RuntimeSalaryChange {
  id: string;

  type: "SALARY_CHANGE";

  effectiveMonth: MonthKey;

  newMonthlyIncome: number;

  description: string;
}

export type RuntimeEvent =
  | RuntimeOneOffExpense
  | RuntimeFixedDeposit
  | RuntimeRecurringDeposit
  | RuntimeBonusIncome
  | RuntimeSalaryChange;