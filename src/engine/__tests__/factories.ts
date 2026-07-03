import type { PlannerConfig } from "@/types/config";
import type { InvestmentAccount } from "@/types/investmentAccount";
import type { MonthKey } from "@/types/simulation";

export const m = (s: string) => s as MonthKey;

export function baseConfig(overrides: Partial<PlannerConfig> = {}): PlannerConfig {
  return {
    forecast: { startMonth: m("2025-01"), totalMonths: 3 },
    income: { monthly: 100_000 },
    cash: { openingBalance: 0 },
    expenses: { defaultMonthly: 50_000, overrides: {} },
    investments: { accounts: [], amountOverrides: [], returnOverrides: [] },
    oneOffExpenses: [],
    creditCardBills: [],
    recurringExpenses: [],
    instruments: [],
    salaryChanges: [],
    bonusIncome: [],
    ...overrides,
  };
}

export function rdBankMaturity(monthlyContribution: number, rate: number, durationMonths: number): number {
  const i = rate / 400;
  return (
    (monthlyContribution * (Math.pow(1 + i, durationMonths / 3) - 1)) /
    (1 - Math.pow(1 + i, -1 / 3))
  );
}

export function account(overrides: Partial<InvestmentAccount> = {}): InvestmentAccount {
  return {
    id: "acc-1",
    name: "Mutual Fund",
    startMonth: m("2025-01"),
    openingBalance: 0,
    defaultAnnualReturn: 12,
    defaultMonthlyContribution: 0,
    ...overrides,
  };
}
