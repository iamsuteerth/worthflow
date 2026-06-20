import { describe, it, expect } from "vitest";
import { builderToConfig } from "@/engine/builderToConfig";
import { configToBuilder } from "@/engine/configToBuilder";
import type { BuilderState } from "@/types/builder";
import { m } from "./factories";

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
