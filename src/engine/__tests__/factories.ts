import type { PlannerConfig } from "@/types/config";
import type { InvestmentAccount } from "@/types/investmentAccount";
import type { MonthKey } from "@/types/simulation";

/**
 * Cast a plain string to a MonthKey. MonthKey is a template-literal type
 * (`${number}-${string}`) so literals need an explicit cast in tests.
 */
export const m = (s: string) => s as MonthKey;

/** A complete, zeroed PlannerConfig. Override only what a test cares about. */
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

/**
 * Textbook Indian-bank RD maturity value (quarterly compounding), derived
 * algebraically from the geometric series — an independent reference for
 * assertions, not a copy of the engine's loop.
 *
 *   M = c · [ (1+i)^(n/3) − 1 ] / [ 1 − (1+i)^(−1/3) ],   i = rate/400, n = months
 */
export function rdBankMaturity(monthlyContribution: number, rate: number, durationMonths: number): number {
  const i = rate / 400;
  return (
    (monthlyContribution * (Math.pow(1 + i, durationMonths / 3) - 1)) /
    (1 - Math.pow(1 + i, -1 / 3))
  );
}

/** An investment account with sensible defaults. */
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
