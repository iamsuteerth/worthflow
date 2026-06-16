import type { AssetSnapshot } from "@/types/assets";
import type { FinancialEvent } from "@/types/events";

export type MonthKey = `${number}-${string}`;

export interface SimulationRow {
  month: MonthKey;
  openingBalance: number;
  closingBalance: number;
  cashflow: MonthlyCashflow;
  assets: AssetSnapshot;
  events: FinancialEvent[];
}

export interface SimulationSummary {
  lowestBalance: number;
  lowestBalanceMonth: MonthKey;
  finalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalOneOffExpenses: number;
  totalRecurringExpenses: number;
  investmentDepositsTotal: number;
  investmentWithdrawalsTotal: number;
  finalInvestmentCorpus: number;
  finalNetWorth: number;
  xirr: number | null;
  accountXirr: Record<string, number | null>;
  accountContributions: Record<string, number>;
}

export interface MonthlyCashflow {
  income: number;
  flatExpense: number;
  creditCardExpense: number;
  oneOffExpense: number;
  recurringExpense: number;
  investmentAmount: number;
  totalInflow: number;
  totalOutflow: number;
}