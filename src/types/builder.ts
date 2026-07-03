import type { MonthKey } from "@/types/simulation";
import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";
import type { RecurringExpense } from "@/types/recurringExpense";
import type { InvestmentAccount } from "@/types/investmentAccount";

export interface BuilderOneOffExpense {
  id: string;
  month: MonthKey;
  label: string;
  amount: number;
}

export interface BuilderCreditCardBill {
  id: string;
  month: MonthKey;
  amount: number;
  label: string;
}

export interface BuilderSalaryChange {
  id: string;
  effectiveMonth: MonthKey;
  newMonthlyIncome: number;
  description: string;
}

export interface BuilderBonusIncome {
  id: string;
  month: MonthKey;
  amount: number;
  description: string;
}

export interface BuilderState {
  startMonth: MonthKey;
  totalMonths: number;
  monthlyIncome: number;
  openingCash: number;
  defaultMonthlyExpense: number;
  investmentAccounts: InvestmentAccount[];
  creditCardBills: BuilderCreditCardBill[];
  oneOffExpenses: BuilderOneOffExpense[];
  salaryChanges: BuilderSalaryChange[];
  bonusIncome: BuilderBonusIncome[];
  recurringExpenses: RecurringExpense[];
  instruments: (FixedDeposit | RecurringDeposit)[];
}
