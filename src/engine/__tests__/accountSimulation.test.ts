import { describe, it, expect } from "vitest";
import {
  getAccountReturn,
  getAccountContribution,
  processAccountMonth,
} from "@/engine/accountSimulation";
import type {
  RuntimeInvestmentDeposit,
  RuntimeInvestmentWithdrawal,
} from "@/types/runtimeEvent";
import { baseConfig, account, m } from "./factories";

const MONTHLY_FACTOR = (annual: number) => Math.pow(1 + annual / 100, 1 / 12);

describe("getAccountReturn", () => {
  it("returns 0 for an unknown account", () => {
    const config = baseConfig({ investments: { accounts: [], amountOverrides: [], returnOverrides: [] } });
    expect(getAccountReturn(config, "missing", m("2025-01"))).toBe(0);
  });

  it("returns the account's default return when no override applies", () => {
    const config = baseConfig({
      investments: { accounts: [account({ defaultAnnualReturn: 11 })], amountOverrides: [], returnOverrides: [] },
    });
    expect(getAccountReturn(config, "acc-1", m("2025-05"))).toBe(11);
  });

  it("returns the override return inside its window and the default outside", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ defaultAnnualReturn: 12 })],
        amountOverrides: [],
        returnOverrides: [
          { id: "r1", accountId: "acc-1", startMonth: m("2025-03"), endMonth: m("2025-06"), annualReturn: 4 },
        ],
      },
    });
    expect(getAccountReturn(config, "acc-1", m("2025-02"))).toBe(12);
    expect(getAccountReturn(config, "acc-1", m("2025-03"))).toBe(4);
    expect(getAccountReturn(config, "acc-1", m("2025-06"))).toBe(4);
    expect(getAccountReturn(config, "acc-1", m("2025-07"))).toBe(12);
  });
});

describe("getAccountContribution", () => {
  it("returns 0 for an unknown account", () => {
    expect(getAccountContribution(baseConfig(), "missing", m("2025-01"))).toBe(0);
  });

  it("returns the default contribution when no override applies", () => {
    const config = baseConfig({
      investments: { accounts: [account({ defaultMonthlyContribution: 5_000 })], amountOverrides: [], returnOverrides: [] },
    });
    expect(getAccountContribution(config, "acc-1", m("2025-09"))).toBe(5_000);
  });

  it("returns the override amount inside its window only", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ defaultMonthlyContribution: 5_000 })],
        amountOverrides: [
          { id: "a1", accountId: "acc-1", startMonth: m("2025-04"), endMonth: m("2025-04"), amount: 12_000 },
        ],
        returnOverrides: [],
      },
    });
    expect(getAccountContribution(config, "acc-1", m("2025-03"))).toBe(5_000);
    expect(getAccountContribution(config, "acc-1", m("2025-04"))).toBe(12_000);
    expect(getAccountContribution(config, "acc-1", m("2025-05"))).toBe(5_000);
  });
});

describe("processAccountMonth", () => {
  it("keeps the balance at zero before the account's start month", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-03") })], amountOverrides: [], returnOverrides: [] },
    });
    const result = processAccountMonth(config, { "acc-1": 0 }, m("2025-01"), [], []);
    expect(result.accountBalances["acc-1"]).toBe(0);
    expect(result.totalContribution).toBe(0);
    expect(result.xirrEntries).toHaveLength(0);
    expect(result.accountSnapshots[0]).toEqual({ accountId: "acc-1", name: "Mutual Fund", value: 0 });
  });

  it("seeds the opening balance and records it as an outflow on the start month", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), openingBalance: 100_000, defaultAnnualReturn: 12, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const result = processAccountMonth(config, { "acc-1": 0 }, m("2025-01"), [], []);
    // Opening balance is seeded, then one month of growth is applied.
    expect(result.accountBalances["acc-1"]).toBeCloseTo(100_000 * MONTHLY_FACTOR(12), 4);
    expect(result.xirrEntries).toEqual([
      { amount: -100_000, date: new Date("2025-01-01"), accountId: "acc-1" },
    ]);
  });

  it("applies one month of compounded growth to an existing balance", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: 12, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const result = processAccountMonth(config, { "acc-1": 100_000 }, m("2025-02"), [], []);
    expect(result.accountBalances["acc-1"]).toBeCloseTo(100_000 * MONTHLY_FACTOR(12), 4);
  });

  it("adds the monthly contribution and records it as an outflow", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: 0, defaultMonthlyContribution: 8_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    // 0% return → no growth; balance moves purely by the contribution.
    const result = processAccountMonth(config, { "acc-1": 20_000 }, m("2025-02"), [], []);
    expect(result.accountBalances["acc-1"]).toBe(28_000);
    expect(result.totalContribution).toBe(8_000);
    expect(result.xirrEntries).toContainEqual({ amount: -8_000, date: new Date("2025-02-01"), accountId: "acc-1" });
  });

  it("clamps account growth so a -100% return cannot make the balance negative", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: -100, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const result = processAccountMonth(config, { "acc-1": 50_000 }, m("2025-02"), [], []);
    expect(result.accountBalances["acc-1"]).toBe(0);
  });

  it("applies a deposit into the account and records it as an outflow", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: 0, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const deposit: RuntimeInvestmentDeposit = {
      id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc-1", month: m("2025-02"), amount: 25_000,
    };
    const result = processAccountMonth(config, { "acc-1": 10_000 }, m("2025-02"), [deposit], []);
    expect(result.accountBalances["acc-1"]).toBe(35_000);
    expect(result.xirrEntries).toContainEqual({ amount: -25_000, date: new Date("2025-02-01"), accountId: "acc-1" });
  });

  it("clamps a withdrawal to the available balance and records only what was taken", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: 0, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const withdrawal: RuntimeInvestmentWithdrawal = {
      id: "w1", type: "INVESTMENT_WITHDRAWAL", accountId: "acc-1", month: m("2025-02"), amount: 15_000,
    };
    const result = processAccountMonth(config, { "acc-1": 10_000 }, m("2025-02"), [], [withdrawal]);
    expect(result.accountBalances["acc-1"]).toBe(0);
    expect(result.xirrEntries).toContainEqual({ amount: 10_000, date: new Date("2025-02-01"), accountId: "acc-1" });
  });

  it("ignores deposits and withdrawals before the account's start month", () => {
    const config = baseConfig({
      investments: { accounts: [account({ startMonth: m("2025-06") })], amountOverrides: [], returnOverrides: [] },
    });
    const deposit: RuntimeInvestmentDeposit = {
      id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc-1", month: m("2025-01"), amount: 25_000,
    };
    const result = processAccountMonth(config, { "acc-1": 0 }, m("2025-01"), [deposit], []);
    expect(result.accountBalances["acc-1"]).toBe(0);
    expect(result.xirrEntries).toHaveLength(0);
  });

  it("does not mutate the balances object it is given", () => {
    const config = baseConfig({
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultMonthlyContribution: 5_000, defaultAnnualReturn: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const original = { "acc-1": 10_000 };
    processAccountMonth(config, original, m("2025-02"), [], []);
    expect(original).toEqual({ "acc-1": 10_000 });
  });
});
