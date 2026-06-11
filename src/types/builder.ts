import type {
  MonthKey,
} from "./simulation";

import type {
  FixedDeposit,
  RecurringDeposit,
} from "./instrument";

export interface InvestmentRange {
  startMonth: MonthKey;
  endMonth: MonthKey;
  amount: number;
}

export interface BuilderOneOffExpense {
  id: string;
  month: MonthKey;
  label: string;
  amount: number;
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
  openingInvestmentCorpus: number;

  defaultMonthlyExpense: number;

  investmentRanges: InvestmentRange[];

  creditCardBills: {
    month: MonthKey;
    amount: number;
  }[];

  oneOffExpenses:
  BuilderOneOffExpense[];

  salaryChanges:
  BuilderSalaryChange[];

  bonusIncome:
  BuilderBonusIncome[];

  instruments: (
    | FixedDeposit
    | RecurringDeposit
  )[];
}