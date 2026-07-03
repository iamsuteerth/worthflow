import type { PlannerOverrides } from "@/types/overrides";

import { describe, it, expect } from "vitest";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { baseConfig, account, m } from "@/engine/__tests__/factories";

describe("buildEffectiveConfig — scalar overrides", () => {
  it("returns an unchanged clone when overrides are empty", () => {
    const config = baseConfig();
    const result = buildEffectiveConfig(config, {});
    expect(result).toEqual(config);
    expect(result).not.toBe(config);
  });

  it("applies incomeMonthly, openingBalance and forecastMonths", () => {
    const result = buildEffectiveConfig(baseConfig(), {
      incomeMonthly: 200_000,
      openingBalance: 50_000,
      forecastMonths: 24,
    });
    expect(result.income.monthly).toBe(200_000);
    expect(result.cash.openingBalance).toBe(50_000);
    expect(result.forecast.totalMonths).toBe(24);
  });

  it("does not mutate the base config", () => {
    const config = baseConfig();
    buildEffectiveConfig(config, {
      incomeMonthly: 999_999,
      runtimeEvents: [{ id: "o1", type: "ONE_OFF_EXPENSE", month: m("2025-02"), amount: 1, label: "x" }],
    });
    expect(config.income.monthly).toBe(100_000);
    expect(config.oneOffExpenses).toHaveLength(0);
  });
});

describe("buildEffectiveConfig — scenario accounts (what-if)", () => {
  it("materialises overrides.scenarioAccounts into the effective account list", () => {
    const config = baseConfig({
      investments: { accounts: [account({ id: "base-1", name: "Base" })], amountOverrides: [], returnOverrides: [] },
    });
    const overrides: PlannerOverrides = {
      scenarioAccounts: [account({ id: "scn-1", name: "What-If SIP", startMonth: m("2025-01"), defaultMonthlyContribution: 5_000 })],
    };
    const result = buildEffectiveConfig(config, overrides);
    expect(result.investments.accounts.map((a) => a.id)).toEqual(["base-1", "scn-1"]);
    expect(config.investments.accounts).toHaveLength(1);
  });

  it("filters a deleted base account (and its base overrides) out of the effective config", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ id: "keep", name: "Keep" }), account({ id: "drop", name: "Drop" })],
        amountOverrides: [
          { id: "ao", accountId: "drop", startMonth: m("2025-02"), endMonth: m("2025-03"), amount: 1_000 },
        ],
        returnOverrides: [],
      },
    });
    const result = buildEffectiveConfig(config, { deletedAccountIds: ["drop"] });
    expect(result.investments.accounts.map((a) => a.id)).toEqual(["keep"]);
    expect(result.investments.amountOverrides).toHaveLength(0);
    expect(config.investments.accounts).toHaveLength(2);
  });

  it("lets an account override target a scenario-created account (materialised first)", () => {
    const config = baseConfig({
      investments: { accounts: [], amountOverrides: [], returnOverrides: [] },
    });
    const overrides: PlannerOverrides = {
      scenarioAccounts: [account({ id: "scn-1", name: "SIP", startMonth: m("2025-01"), defaultMonthlyContribution: 5_000 })],
      runtimeEvents: [
        { id: "ao-1", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "scn-1", startMonth: m("2025-02"), endMonth: m("2025-03"), amount: 9_000 },
      ],
    };
    const result = buildEffectiveConfig(config, overrides);
    expect(result.investments.amountOverrides).toContainEqual(
      expect.objectContaining({ accountId: "scn-1", amount: 9_000 }),
    );
  });
});

describe("buildEffectiveConfig — runtime events", () => {
  it("appends one-off, credit-card and bonus/salary/recurring events", () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "o1", type: "ONE_OFF_EXPENSE", month: m("2025-02"), amount: 10_000, label: "Laptop" },
        { id: "c1", type: "CREDIT_CARD_EXPENSE", month: m("2025-02"), amount: 7_000, label: "HDFC" },
        { id: "b1", type: "BONUS_INCOME", month: m("2025-03"), amount: 40_000, description: "Bonus" },
        { id: "s1", type: "SALARY_CHANGE", effectiveMonth: m("2025-03"), newMonthlyIncome: 150_000, description: "Raise" },
        { id: "re1", type: "RECURRING_EXPENSE", name: "Gym", amount: 2_000, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" },
      ],
    };
    const result = buildEffectiveConfig(baseConfig(), overrides);
    expect(result.oneOffExpenses).toHaveLength(1);
    expect(result.creditCardBills).toHaveLength(1);
    expect(result.bonusIncome).toHaveLength(1);
    expect(result.salaryChanges).toHaveLength(1);
    expect(result.recurringExpenses).toHaveLength(1);
    expect(result.recurringExpenses[0].frequency).toBe("MONTHLY");
  });

  it("appends FD and RD instruments with the correct shape", () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "fd1", type: "FD", name: "FD A", principal: 100_000, rate: 7, startMonth: m("2025-01"), durationMonths: 12 },
        { id: "rd1", type: "RD", name: "RD A", monthlyContribution: 5_000, rate: 6, startMonth: m("2025-01"), durationMonths: 12 },
      ],
    };
    const result = buildEffectiveConfig(baseConfig(), overrides);
    expect(result.instruments).toHaveLength(2);
    expect(result.instruments[0]).toMatchObject({ type: "FD", principal: 100_000 });
    expect(result.instruments[1]).toMatchObject({ type: "RD", monthlyContribution: 5_000 });
  });

  it("accepts a valid account amount override", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-01") })], amountOverrides: [], returnOverrides: [] },
    });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "a1", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "acc-1", startMonth: m("2025-03"), endMonth: m("2025-06"), amount: 9_000 },
      ],
    });
    expect(result.investments.amountOverrides).toHaveLength(1);
  });

  it("rejects an account amount override for an unknown account", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-01") })], amountOverrides: [], returnOverrides: [] },
    });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "a1", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "ghost", startMonth: m("2025-03"), endMonth: m("2025-06"), amount: 9_000 },
      ],
    });
    expect(result.investments.amountOverrides).toHaveLength(0);
  });

  it("rejects an account override that starts before the account's start month", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-05") })], amountOverrides: [], returnOverrides: [] },
    });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "a1", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "acc-1", startMonth: m("2025-03"), endMonth: m("2025-06"), amount: 9_000 },
      ],
    });
    expect(result.investments.amountOverrides).toHaveLength(0);
  });

  it("accepts a valid account return override", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-01") })], amountOverrides: [], returnOverrides: [] },
    });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "r1", type: "ACCOUNT_RETURN_OVERRIDE", accountId: "acc-1", startMonth: m("2025-03"), endMonth: m("2025-06"), annualReturn: 4 },
      ],
    });
    expect(result.investments.returnOverrides).toHaveLength(1);
  });

  it("writes a spending override into expense overrides for in-range forecast months only", () => {
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 6 } });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "sp1", type: "SPENDING_OVERRIDE", startMonth: m("2025-02"), endMonth: m("2025-04"), amount: 30_000 },
      ],
    });
    expect(result.expenses.overrides).toEqual({
      "2025-02": 30_000,
      "2025-03": 30_000,
      "2025-04": 30_000,
    });
  });

  it("does not write spending overrides outside the forecast horizon", () => {
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 3 } });
    const result = buildEffectiveConfig(config, {
      runtimeEvents: [
        { id: "sp1", type: "SPENDING_OVERRIDE", startMonth: m("2025-02"), endMonth: m("2025-12"), amount: 30_000 },
      ],
    });
    expect(Object.keys(result.expenses.overrides)).toEqual(["2025-02", "2025-03"]);
  });

  it("applies an opening cash override", () => {
    const result = buildEffectiveConfig(baseConfig(), {
      runtimeEvents: [{ id: "oc1", type: "OPENING_CASH_OVERRIDE", amount: 75_000 }],
    });
    expect(result.cash.openingBalance).toBe(75_000);
  });
});
