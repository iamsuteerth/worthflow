import type { BuilderState } from "@/types/builder";
import type { EventType } from "@/types/events";

import { describe, it, expect } from "vitest";

import { m } from "@/engine/__tests__/factories";
import { builderToConfig } from "@/engine/builderToConfig";
import { getEventCategory, EVENT_CATEGORY_LIST, FINANCIAL_EVENT_CATEGORY } from "@/engine/eventCategories";
import { formatMonth } from "@/engine/monthFormatting";

describe("formatMonth", () => {
  it("formats a month key as a long month and year", () => {
    expect(formatMonth("2025-01")).toBe("January 2025");
    expect(formatMonth("2025-12")).toBe("December 2025");
    expect(formatMonth("2030-06")).toBe("June 2030");
  });
});

describe("getEventCategory", () => {
  it("maps representative event types to their category", () => {
    expect(getEventCategory("BONUS_INCOME")).toBe("Income");
    expect(getEventCategory("ONE_OFF_EXPENSE")).toBe("Expenses");
    expect(getEventCategory("INVESTMENT_DEPOSIT")).toBe("Investments");
    expect(getEventCategory("FD_MATURED")).toBe("FD");
    expect(getEventCategory("RD_CREATED")).toBe("RD");
  });

  it("maps every known event type to a valid category", () => {
    for (const type of Object.keys(FINANCIAL_EVENT_CATEGORY) as EventType[]) {
      expect(EVENT_CATEGORY_LIST).toContain(getEventCategory(type));
    }
  });
});

describe("builderToConfig", () => {
  it("maps builder state onto a planner config with empty override containers", () => {
    const builder: BuilderState = {
      startMonth: m("2025-01"),
      totalMonths: 24,
      monthlyIncome: 100_000,
      openingCash: 40_000,
      defaultMonthlyExpense: 50_000,
      investmentAccounts: [
        { id: "a1", name: "MF", startMonth: m("2025-01"), openingBalance: 0, defaultAnnualReturn: 12, defaultMonthlyContribution: 5_000 },
      ],
      creditCardBills: [{ id: "c1", month: m("2025-02"), amount: 7_000, label: "HDFC" }],
      oneOffExpenses: [{ id: "o1", month: m("2025-03"), amount: 10_000, label: "Laptop" }],
      salaryChanges: [{ id: "s1", effectiveMonth: m("2025-06"), newMonthlyIncome: 120_000, description: "Raise" }],
      bonusIncome: [{ id: "b1", month: m("2025-12"), amount: 50_000, description: "Bonus" }],
      recurringExpenses: [{ id: "re1", name: "Gym", amount: 2_000, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" }],
      instruments: [{ id: "fd1", type: "FD", name: "FD", principal: 100_000, rate: 7, startMonth: m("2025-01"), durationMonths: 12 }],
    };

    const config = builderToConfig(builder);

    expect(config.forecast).toEqual({ startMonth: "2025-01", totalMonths: 24 });
    expect(config.income.monthly).toBe(100_000);
    expect(config.cash.openingBalance).toBe(40_000);
    expect(config.expenses).toEqual({ defaultMonthly: 50_000, overrides: {} });
    expect(config.investments.amountOverrides).toEqual([]);
    expect(config.investments.returnOverrides).toEqual([]);
    expect(config.investments.accounts).toHaveLength(1);
    expect(config.creditCardBills).toHaveLength(1);
    expect(config.instruments).toHaveLength(1);
    expect(config.recurringExpenses).toHaveLength(1);
  });

  it("defaults recurringExpenses to an empty array when absent", () => {
    const builder = {
      startMonth: m("2025-01"),
      totalMonths: 12,
      monthlyIncome: 100_000,
      openingCash: 0,
      defaultMonthlyExpense: 50_000,
      investmentAccounts: [],
      creditCardBills: [],
      oneOffExpenses: [],
      salaryChanges: [],
      bonusIncome: [],
      instruments: [],
    } as unknown as BuilderState;

    expect(builderToConfig(builder).recurringExpenses).toEqual([]);
  });
});
