import type { BuilderState } from "@/types/builder";
import type { PlannerConfig } from "@/types/config";

import { describe, it, expect } from "vitest";

import {
  findOutOfWindowItems,
  findOutOfWindowInConfig,
  planHasOutOfWindowItems,
  snapStateIntoWindow,
} from "@/engine/builderWindow";

// Window: 2026-08 .. 2027-07 (12 months)
function baseState(): BuilderState {
  return {
    startMonth: "2026-08",
    totalMonths: 12,
    monthlyIncome: 100000,
    openingCash: 50000,
    defaultMonthlyExpense: 30000,
    investmentAccounts: [],
    creditCardBills: [],
    oneOffExpenses: [],
    salaryChanges: [],
    bonusIncome: [],
    recurringExpenses: [],
    instruments: [],
  };
}

const account = (id: string, startMonth: string) => ({
  id,
  name: `Acct ${id}`,
  startMonth: startMonth as never,
  openingBalance: 10000,
  defaultAnnualReturn: 8,
  defaultMonthlyContribution: 1000,
});

describe("findOutOfWindowItems", () => {
  it("returns nothing when everything is inside the window", () => {
    const state: BuilderState = {
      ...baseState(),
      investmentAccounts: [account("a", "2026-08"), account("b", "2027-07")],
      oneOffExpenses: [{ id: "o1", month: "2026-09" as never, label: "Laptop", amount: 5000 }],
    };
    expect(findOutOfWindowItems(state)).toEqual([]);
  });

  it("accepts items exactly on the first and last month (inclusive)", () => {
    const state: BuilderState = {
      ...baseState(),
      investmentAccounts: [account("a", "2026-08"), account("b", "2027-07")],
    };
    expect(findOutOfWindowItems(state)).toEqual([]);
  });

  it("flags an account starting before the window", () => {
    const state: BuilderState = {
      ...baseState(),
      investmentAccounts: [account("a", "2026-07")],
    };
    const oob = findOutOfWindowItems(state);
    expect(oob).toHaveLength(1);
    expect(oob[0]).toMatchObject({ kind: "account", id: "a", current: "2026-07" });
  });

  it("flags an account starting after the window", () => {
    const state: BuilderState = {
      ...baseState(),
      investmentAccounts: [account("a", "2027-08")],
    };
    expect(findOutOfWindowItems(state).map((i) => i.kind)).toEqual(["account"]);
  });

  it("flags out-of-window one-off, credit card, bonus and salary events by kind", () => {
    const state: BuilderState = {
      ...baseState(),
      oneOffExpenses: [{ id: "o", month: "2026-07" as never, label: "x", amount: 1 }],
      creditCardBills: [{ id: "c", month: "2027-08" as never, label: "y", amount: 1 }],
      bonusIncome: [{ id: "b", month: "2026-01" as never, description: "z", amount: 1 }],
      salaryChanges: [{ id: "s", effectiveMonth: "2028-01" as never, description: "raise", newMonthlyIncome: 1 }],
    };
    expect(findOutOfWindowItems(state).map((i) => i.kind).sort()).toEqual([
      "bonus",
      "creditCard",
      "oneOff",
      "salary",
    ]);
  });

  it("flags a monthly recurring expense whose range leaves the window", () => {
    const state: BuilderState = {
      ...baseState(),
      recurringExpenses: [
        { id: "r", name: "Rent", amount: 1000, startMonth: "2026-08" as never, endMonth: "2027-12" as never, frequency: "MONTHLY" },
      ],
    };
    const oob = findOutOfWindowItems(state);
    expect(oob).toHaveLength(1);
    expect(oob[0]).toMatchObject({ kind: "recurring", current: "2026-08 → 2027-12" });
  });

  it("accepts an anniversary-aligned annual range and flags misaligned or out-of-window ones", () => {
    // 24-month window: 2026-08 .. 2028-07.
    const window24: BuilderState = { ...baseState(), totalMonths: 24 };

    // Valid: two yearly charges, end exactly one year after start.
    expect(
      findOutOfWindowItems({
        ...window24,
        recurringExpenses: [
          { id: "ok", name: "Insurance", amount: 1000, startMonth: "2026-08" as never, endMonth: "2027-08" as never, frequency: "ANNUAL" },
        ],
      })
    ).toEqual([]);

    // Invalid: both endpoints in window, but the end is not on an anniversary of the start.
    expect(
      findOutOfWindowItems({
        ...window24,
        recurringExpenses: [
          { id: "bad1", name: "Insurance", amount: 1000, startMonth: "2026-08" as never, endMonth: "2027-01" as never, frequency: "ANNUAL" },
        ],
      }).map((i) => i.kind)
    ).toEqual(["recurring"]);

    // Invalid: end past the window end (2028-07).
    expect(
      findOutOfWindowItems({
        ...window24,
        recurringExpenses: [
          { id: "bad2", name: "Insurance", amount: 1000, startMonth: "2026-08" as never, endMonth: "2028-08" as never, frequency: "ANNUAL" },
        ],
      }).map((i) => i.kind)
    ).toEqual(["recurring"]);
  });

  it("never flags FD/RD instruments even when they start before the window", () => {
    const state: BuilderState = {
      ...baseState(),
      instruments: [
        { type: "FD", id: "fd", name: "SBI", principal: 10000, rate: 7, startMonth: "2026-01" as never, durationMonths: 24 },
        { type: "RD", id: "rd", name: "PO", monthlyContribution: 1000, rate: 7, startMonth: "2025-06" as never, durationMonths: 36 },
      ],
    };
    expect(findOutOfWindowItems(state)).toEqual([]);
  });
});

describe("findOutOfWindowInConfig / planHasOutOfWindowItems", () => {
  function baseConfig(startMonth: string): PlannerConfig {
    return {
      forecast: { startMonth: startMonth as never, totalMonths: 12 },
      income: { monthly: 100000 },
      cash: { openingBalance: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: { accounts: [account("a", "2026-07")], amountOverrides: [], returnOverrides: [] },
      oneOffExpenses: [],
      creditCardBills: [],
      recurringExpenses: [],
      instruments: [],
      salaryChanges: [],
      bonusIncome: [],
    };
  }

  it("detects an out-of-window base account in a loaded config", () => {
    const config = baseConfig("2026-08"); // account starts 2026-07, window 2026-08..
    expect(planHasOutOfWindowItems(config)).toBe(true);
    expect(findOutOfWindowInConfig(config).map((i) => i.kind)).toEqual(["account"]);
  });

  it("passes a clean config", () => {
    const config = baseConfig("2026-07"); // account 2026-07 now the first month
    expect(planHasOutOfWindowItems(config)).toBe(false);
  });
});

describe("snapStateIntoWindow", () => {
  it("clamps accounts and point events into the window, leaves FD/RD alone", () => {
    // Window 2026-08 .. 2027-07.
    const state: BuilderState = {
      ...baseState(),
      investmentAccounts: [account("before", "2026-05"), account("after", "2027-11")],
      oneOffExpenses: [{ id: "o", month: "2026-01" as never, label: "x", amount: 1 }],
      salaryChanges: [{ id: "s", effectiveMonth: "2028-03" as never, description: "raise", newMonthlyIncome: 1 }],
      instruments: [
        { type: "FD", id: "fd", name: "SBI", principal: 1000, rate: 7, startMonth: "2026-01" as never, durationMonths: 24 },
      ],
    };

    const snapped = snapStateIntoWindow(state);

    expect(snapped.investmentAccounts[0].startMonth).toBe("2026-08"); // clamped up to start
    expect(snapped.investmentAccounts[1].startMonth).toBe("2027-07"); // clamped down to end
    expect(snapped.oneOffExpenses[0].month).toBe("2026-08");
    expect(snapped.salaryChanges[0].effectiveMonth).toBe("2027-07");
    expect(snapped.instruments[0].startMonth).toBe("2026-01"); // FD untouched
    // Everything is now inside the window.
    expect(findOutOfWindowItems(snapped)).toEqual([]);
  });

  it("shifts a monthly recurring range into the window and clamps its end", () => {
    const state: BuilderState = {
      ...baseState(),
      recurringExpenses: [
        { id: "r", name: "Rent", amount: 1000, startMonth: "2026-06" as never, endMonth: "2027-12" as never, frequency: "MONTHLY" },
      ],
    };
    const r = snapStateIntoWindow(state).recurringExpenses[0];
    expect(r.startMonth).toBe("2026-08");
    expect(r.endMonth).toBe("2027-07");
    expect(findOutOfWindowItems(snapStateIntoWindow(state))).toEqual([]);
  });

  it("refits an annual recurring so the snapped range stays anniversary-aligned and in-window", () => {
    const state: BuilderState = {
      ...baseState(),
      recurringExpenses: [
        // Two intended charges starting before the window (2026-05 → 2027-05).
        { id: "r", name: "Insurance", amount: 1000, startMonth: "2026-05" as never, endMonth: "2027-05" as never, frequency: "ANNUAL" },
      ],
    };
    const r = snapStateIntoWindow(state).recurringExpenses[0];
    expect(r.startMonth).toBe("2026-08");
    // 12-month window only fits one annual charge, so it refits to a single charge.
    expect(r.endMonth).toBe("2026-08");
    expect(findOutOfWindowItems(snapStateIntoWindow(state))).toEqual([]);
  });
});
