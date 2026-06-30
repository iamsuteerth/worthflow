import { describe, it, expect } from "vitest";
import {
  getMonthlyExpense,
  getMonthlyIncome,
  getCreditCardExpense,
  getOneOffExpense,
  getRecurringExpense,
  getBonusIncome,
  isRecurringExpenseActive,
} from "@/engine/configLookups";
import type { PlannerConfig } from "@/types/config";
import type { MonthKey } from "@/types/simulation";

const m = (s: string) => s as MonthKey;

function baseConfig(overrides: Partial<PlannerConfig> = {}): PlannerConfig {
  return {
    forecast: { startMonth: "2025-01", totalMonths: 12 },
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

describe("getMonthlyExpense", () => {
  it("returns defaultMonthly when no override exists", () => {
    expect(getMonthlyExpense(baseConfig(), "2025-03")).toBe(50_000);
  });

  it("returns the override amount when one is set for that month", () => {
    const config = baseConfig({ expenses: { defaultMonthly: 50_000, overrides: { "2025-03": 30_000 } } });
    expect(getMonthlyExpense(config, "2025-03")).toBe(30_000);
  });

  it("falls back to defaultMonthly for months not in overrides", () => {
    const config = baseConfig({ expenses: { defaultMonthly: 50_000, overrides: { "2025-03": 30_000 } } });
    expect(getMonthlyExpense(config, "2025-04")).toBe(50_000);
  });
});

describe("getMonthlyIncome", () => {
  it("returns base income when no salary changes", () => {
    expect(getMonthlyIncome(baseConfig(), "2025-06")).toBe(100_000);
  });

  it("returns base income in months before any salary change", () => {
    const config = baseConfig({
      salaryChanges: [{ id: "1", effectiveMonth: "2025-06", newMonthlyIncome: 150_000, description: "Raise" }],
    });
    expect(getMonthlyIncome(config, "2025-05")).toBe(100_000);
  });

  it("returns new salary in months at and after the effective month", () => {
    const config = baseConfig({
      salaryChanges: [{ id: "1", effectiveMonth: "2025-06", newMonthlyIncome: 150_000, description: "Raise" }],
    });
    expect(getMonthlyIncome(config, "2025-06")).toBe(150_000);
    expect(getMonthlyIncome(config, "2025-12")).toBe(150_000);
  });

  it("applies the latest salary change when multiple exist", () => {
    const config = baseConfig({
      salaryChanges: [
        { id: "1", effectiveMonth: "2025-03", newMonthlyIncome: 120_000, description: "First raise" },
        { id: "2", effectiveMonth: "2025-07", newMonthlyIncome: 160_000, description: "Promotion" },
      ],
    });
    expect(getMonthlyIncome(config, "2025-05")).toBe(120_000);
    expect(getMonthlyIncome(config, "2025-07")).toBe(160_000);
  });
});

describe("getCreditCardExpense", () => {
  it("returns 0 when no credit card bills", () => {
    expect(getCreditCardExpense(baseConfig(), "2025-03")).toBe(0);
  });

  it("returns the bill amount for the matching month", () => {
    const config = baseConfig({
      creditCardBills: [{ id: "1", month: "2025-03", amount: 15_000, label: "HDFC March" }],
    });
    expect(getCreditCardExpense(config, "2025-03")).toBe(15_000);
    expect(getCreditCardExpense(config, "2025-04")).toBe(0);
  });

  it("sums multiple bills in the same month (e.g. an ICICI and an SBI bill)", () => {
    const config = baseConfig({
      creditCardBills: [
        { id: "1", month: "2025-03", amount: 4_707, label: "ICICI Bill" },
        { id: "2", month: "2025-03", amount: 863, label: "SBI Bill" },
      ],
    });
    expect(getCreditCardExpense(config, "2025-03")).toBe(5_570);
  });
});

describe("getOneOffExpense", () => {
  it("returns 0 when no one-off expenses", () => {
    expect(getOneOffExpense(baseConfig(), "2025-03")).toBe(0);
  });

  it("sums multiple expenses in the same month", () => {
    const config = baseConfig({
      oneOffExpenses: [
        { id: "1", month: "2025-03", amount: 10_000, label: "A" },
        { id: "2", month: "2025-03", amount: 5_000, label: "B" },
      ],
    });
    expect(getOneOffExpense(config, "2025-03")).toBe(15_000);
    expect(getOneOffExpense(config, "2025-04")).toBe(0);
  });
});

describe("isRecurringExpenseActive", () => {
  it("is active for a MONTHLY expense within its range", () => {
    const re = { id: "1", name: "Gym", amount: 2_000, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" as const };
    expect(isRecurringExpenseActive(re, m("2025-06"))).toBe(true);
    expect(isRecurringExpenseActive(re, m("2025-01"))).toBe(true);
    expect(isRecurringExpenseActive(re, m("2025-12"))).toBe(true);
  });

  it("is inactive for a MONTHLY expense outside its range", () => {
    const re = { id: "1", name: "Gym", amount: 2_000, startMonth: m("2025-03"), endMonth: m("2025-09"), frequency: "MONTHLY" as const };
    expect(isRecurringExpenseActive(re, m("2025-02"))).toBe(false);
    expect(isRecurringExpenseActive(re, m("2025-10"))).toBe(false);
  });

  it("is active for an ANNUAL expense only in the same calendar month as its start", () => {
    // startMonth "2025-03" → fires every March
    const re = { id: "1", name: "Insurance", amount: 20_000, startMonth: m("2025-03"), endMonth: m("2027-03"), frequency: "ANNUAL" as const };
    expect(isRecurringExpenseActive(re, m("2025-03"))).toBe(true);
    expect(isRecurringExpenseActive(re, m("2026-03"))).toBe(true);
    expect(isRecurringExpenseActive(re, m("2025-04"))).toBe(false);
    expect(isRecurringExpenseActive(re, m("2026-04"))).toBe(false);
  });
});

describe("getRecurringExpense", () => {
  it("sums all active recurring expenses for a month", () => {
    const config = baseConfig({
      recurringExpenses: [
        { id: "1", name: "Gym", amount: 2_000, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" as const },
        { id: "2", name: "OTT", amount: 500, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" as const },
      ],
    });
    expect(getRecurringExpense(config, "2025-06")).toBe(2_500);
  });
});

describe("getBonusIncome", () => {
  it("returns 0 when there is no bonus in the month", () => {
    expect(getBonusIncome(baseConfig(), "2025-03")).toBe(0);
  });

  it("sums all bonuses in the target month and ignores other months", () => {
    const config = baseConfig({
      bonusIncome: [
        { id: "b1", month: "2025-03", amount: 40_000, description: "Annual" },
        { id: "b2", month: "2025-03", amount: 10_000, description: "Spot" },
        { id: "b3", month: "2025-04", amount: 5_000, description: "Other" },
      ],
    });
    expect(getBonusIncome(config, "2025-03")).toBe(50_000);
    expect(getBonusIncome(config, "2025-04")).toBe(5_000);
    expect(getBonusIncome(config, "2025-05")).toBe(0);
  });
});
