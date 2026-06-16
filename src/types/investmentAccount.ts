import type { MonthKey } from "@/types/simulation";

export interface InvestmentAccount {
  id: string;
  name: string;
  startMonth: MonthKey;
  openingBalance: number;
  defaultAnnualReturn: number;
  defaultMonthlyContribution: number;
}

export interface AccountAmountOverride {
  id: string;
  accountId: string;
  startMonth: MonthKey;
  endMonth: MonthKey;
  amount: number;
}

export interface AccountReturnOverride {
  id: string;
  accountId: string;
  startMonth: MonthKey;
  endMonth: MonthKey;
  annualReturn: number;
}

export interface AccountSnapshot {
  accountId: string;
  name: string;
  value: number;
}
