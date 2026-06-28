import type { MonthKey } from "@/types/simulation";

export interface InvestmentAccount {
  id: string;
  name: string;
  startMonth: MonthKey;
  openingBalance: number;
  defaultAnnualReturn: number;
  defaultMonthlyContribution: number;
  // Set when a scenario ("what-if") account was created by applying an AI proposal:
  // the proposing chat message's id. Lets the proposal card derive its applied state
  // from the plan. Base accounts and UI-created accounts leave this unset.
  sourceProposalId?: string;
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
