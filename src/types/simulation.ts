import type { AssetSnapshot } from "./assets";
import type { FinancialEvent } from "./events";

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

  finalInvestmentCorpus: number;

  finalNetWorth: number;
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