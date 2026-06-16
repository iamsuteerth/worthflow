import type { MonthKey } from "@/types/simulation";

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

export interface RuntimeCreditCardExpense {
  id: string;
  type: "CREDIT_CARD_EXPENSE";
  month: MonthKey;
  amount: number;
  label: string;
}

export interface RuntimeAccountAmountOverride {
  id: string;
  type: "ACCOUNT_AMOUNT_OVERRIDE";
  accountId: string;
  startMonth: MonthKey;
  endMonth: MonthKey;
  amount: number;
}

export interface RuntimeAccountReturnOverride {
  id: string;
  type: "ACCOUNT_RETURN_OVERRIDE";
  accountId: string;
  startMonth: MonthKey;
  endMonth: MonthKey;
  annualReturn: number;
}

export interface RuntimeInvestmentDeposit {
  id: string;
  type: "INVESTMENT_DEPOSIT";
  accountId: string;
  month: MonthKey;
  amount: number;
}

export interface RuntimeInvestmentWithdrawal {
  id: string;
  type: "INVESTMENT_WITHDRAWAL";
  accountId: string;
  month: MonthKey;
  amount: number;
}

export interface RuntimeRecurringExpense {
  id: string;
  type: "RECURRING_EXPENSE";
  name: string;
  amount: number;
  startMonth: MonthKey;
  endMonth: MonthKey;
  frequency: "MONTHLY" | "ANNUAL";
}

export interface RuntimeSpendingOverride {
  id: string;
  type: "SPENDING_OVERRIDE";
  startMonth: MonthKey;
  endMonth: MonthKey;
  amount: number;
}

export interface RuntimeOpeningCashOverride {
  id: string;
  type: "OPENING_CASH_OVERRIDE";
  amount: number;
}

export type RuntimeEvent =
  | RuntimeOneOffExpense
  | RuntimeFixedDeposit
  | RuntimeRecurringDeposit
  | RuntimeBonusIncome
  | RuntimeSalaryChange
  | RuntimeCreditCardExpense
  | RuntimeAccountAmountOverride
  | RuntimeAccountReturnOverride
  | RuntimeInvestmentDeposit
  | RuntimeInvestmentWithdrawal
  | RuntimeRecurringExpense
  | RuntimeSpendingOverride
  | RuntimeOpeningCashOverride;
