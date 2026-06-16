import type { MonthKey }
  from "@/types/simulation"

export interface SalaryChange {
  id: string;

  effectiveMonth: MonthKey;

  newMonthlyIncome: number;

  description: string;
}

export interface BonusIncome {
  id: string;

  month: MonthKey;

  amount: number;

  description: string;
}