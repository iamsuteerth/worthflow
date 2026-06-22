import { describe, it, expect } from "vitest";
import { builderToConfig } from "@/engine/builderToConfig";
import { configToBuilder } from "@/engine/configToBuilder";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import type { BuilderState } from "@/types/builder";
import type { PlannerOverrides } from "@/types/overrides";
import { baseConfig, account, m } from "./factories";

const baseState: BuilderState = {
  startMonth: m("2025-01"),
  totalMonths: 24,
  monthlyIncome: 150_000,
  openingCash: 100_000,
  defaultMonthlyExpense: 60_000,
  investmentAccounts: [
    { id: "acc-1", name: "Mutual Fund", startMonth: m("2025-01"), openingBalance: 50_000, defaultAnnualReturn: 12, defaultMonthlyContribution: 5_000 },
  ],
  creditCardBills: [{ id: "cc-1", month: m("2025-03"), amount: 20_000, label: "CC Bill" }],
  oneOffExpenses: [{ id: "oe-1", month: m("2025-06"), label: "Laptop", amount: 80_000 }],
  salaryChanges: [{ id: "sc-1", effectiveMonth: m("2025-07"), newMonthlyIncome: 180_000, description: "Hike" }],
  bonusIncome: [{ id: "bi-1", month: m("2025-04"), amount: 50_000, description: "Bonus" }],
  recurringExpenses: [{ id: "re-1", name: "Netflix", amount: 500, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" }],
  instruments: [{ id: "fd-1", type: "FD", name: "HDFC FD", principal: 100_000, rate: 7.5, startMonth: m("2025-02"), durationMonths: 12 }],
};

describe('configToBuilder — "Keep my edits" promotion (effective config → builder draft)', () => {
  it("carries scenario accounts, FDs and expenses, but drops baseline-unrepresentable overrides", () => {
    const cfg = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      cash: { openingBalance: 300_000 },
      investments: {
        accounts: [account({ id: "base-acc", name: "Base", startMonth: m("2025-01"), defaultMonthlyContribution: 5_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const overrides: PlannerOverrides = {
      scenarioAccounts: [account({ id: "scn", name: "What-If SIP", startMonth: m("2025-02"), openingBalance: 0, defaultMonthlyContribution: 4_000 })],
      runtimeEvents: [
        { id: "fd", type: "FD", name: "Scenario FD", principal: 50_000, rate: 7, startMonth: m("2025-03"), durationMonths: 12 },
        { id: "oe", type: "ONE_OFF_EXPENSE", month: m("2025-04"), amount: 10_000, label: "Trip" },
        // Override-layer + flows — NOT representable in the baseline-only builder.
        { id: "ao", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "base-acc", startMonth: m("2025-02"), endMonth: m("2025-05"), amount: 9_000 },
        { id: "dep", type: "INVESTMENT_DEPOSIT", accountId: "base-acc", month: m("2025-03"), amount: 1_000 },
      ],
    };

    const draft = configToBuilder(buildEffectiveConfig(cfg, overrides));

    // Carried: the scenario account, the scenario FD, and the one-off expense.
    expect(draft.investmentAccounts.map((a) => a.id).sort()).toEqual(["base-acc", "scn"]);
    expect(draft.instruments.map((i) => i.name)).toContain("Scenario FD");
    expect(draft.oneOffExpenses.map((e) => e.label)).toContain("Trip");

    // Dropped (builder edits the baseline only): amount overrides and deposits.
    const generated = builderToConfig(draft);
    expect(generated.investments.amountOverrides).toHaveLength(0);
  });

  it("a deleted base account is absent from the promoted builder draft", () => {
    const cfg = baseConfig({
      investments: {
        accounts: [account({ id: "keep", name: "Keep" }), account({ id: "gone", name: "Gone" })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const draft = configToBuilder(buildEffectiveConfig(cfg, { deletedAccountIds: ["gone"] }));
    expect(draft.investmentAccounts.map((a) => a.id)).toEqual(["keep"]);
  });
});

describe("configToBuilder", () => {
  it("round-trips: builderToConfig(configToBuilder(builderToConfig(s))) equals builderToConfig(s)", () => {
    const config = builderToConfig(baseState);
    const roundTripped = builderToConfig(configToBuilder(config));
    expect(roundTripped).toEqual(config);
  });

  it("maps all baseline fields correctly", () => {
    const result = configToBuilder(builderToConfig(baseState));
    expect(result.startMonth).toBe(baseState.startMonth);
    expect(result.totalMonths).toBe(baseState.totalMonths);
    expect(result.monthlyIncome).toBe(baseState.monthlyIncome);
    expect(result.openingCash).toBe(baseState.openingCash);
    expect(result.defaultMonthlyExpense).toBe(baseState.defaultMonthlyExpense);
    expect(result.investmentAccounts).toEqual(baseState.investmentAccounts);
    expect(result.creditCardBills).toEqual(baseState.creditCardBills);
    expect(result.oneOffExpenses).toEqual(baseState.oneOffExpenses);
    expect(result.salaryChanges).toEqual(baseState.salaryChanges);
    expect(result.bonusIncome).toEqual(baseState.bonusIncome);
    expect(result.recurringExpenses).toEqual(baseState.recurringExpenses);
    expect(result.instruments).toEqual(baseState.instruments);
  });

  it("returns shallow copies of arrays (not same references)", () => {
    const config = builderToConfig(baseState);
    const result = configToBuilder(config);
    expect(result.investmentAccounts).not.toBe(config.investments.accounts);
    expect(result.oneOffExpenses).not.toBe(config.oneOffExpenses);
  });

  it("drops override-layer fields — expenses.overrides, investments.*Overrides come back empty", () => {
    const config = builderToConfig(baseState);
    // builderToConfig always produces empty override collections
    expect(config.expenses.overrides).toEqual({});
    expect(config.investments.amountOverrides).toEqual([]);
    expect(config.investments.returnOverrides).toEqual([]);
    // configToBuilder never reads those fields, so they're absent from BuilderState
    const result = configToBuilder(config);
    expect(result).not.toHaveProperty("expenses");
    expect(result).not.toHaveProperty("overrides");
  });
});
