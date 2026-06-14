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

  investmentDepositsTotal: number;

  investmentWithdrawalsTotal: number;

  finalInvestmentCorpus: number;

  finalNetWorth: number;

  xirr: number | null;
}

export interface MonthlyCashflow {
  income: number;

  flatExpense: number;

  creditCardExpense: number;

  oneOffExpense: number;

  investmentAmount: number;

  totalInflow: number;

  totalOutflow: number;
}