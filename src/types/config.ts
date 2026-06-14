// src/types/config.ts
import type { Instrument } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";
import type {
  SalaryChange,
  BonusIncome,
} from "@/types/incomeEvents";

export interface ForecastConfig {
  startMonth: MonthKey;
  totalMonths: number;
}

export interface IncomeConfig {
  monthly: number;
}

export interface CashConfig {
  openingBalance: number;
}

export interface ExpenseConfig {
  defaultMonthly: number;
  overrides: Record<string, number>;
}

export interface InvestmentReturnOverride {
  startMonth: MonthKey;
  endMonth: MonthKey;
  annualReturn: number;
}

export interface InvestmentConfig {
  openingCorpus: number;
  schedule: Record<string, number>;
  defaultAnnualReturn: number;
  returnOverrides: InvestmentReturnOverride[];
}

export interface OneOffExpense {
  id: string;
  month: MonthKey;
  label: string;
  amount: number;
}

export interface CreditCardBill {
  id: string;
  month: MonthKey;
  amount: number;
  label: string;
}

export interface PlannerConfig {
  forecast: ForecastConfig;

  income: IncomeConfig;

  cash: CashConfig;

  expenses: ExpenseConfig;

  investments: InvestmentConfig;

  oneOffExpenses: OneOffExpense[];

  creditCardBills: CreditCardBill[];

  instruments: Instrument[];

  salaryChanges: SalaryChange[];

  bonusIncome: BonusIncome[];
}