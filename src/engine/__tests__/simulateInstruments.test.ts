import type { PlannerOverrides } from "@/types/overrides";

import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import { baseConfig, account, m, rdBankMaturity } from "@/engine/__tests__/factories";

const rdAges = (c: number, rate: number, ages: number[]) =>
  ages.reduce((sum, age) => sum + c * Math.pow(1 + rate / 400, age / 3), 0);

const fdValue = (principal: number, rate: number, months: number) =>
  principal * Math.pow(1 + rate / 400, months / 3);

describe("simulate — fixed deposits (end to end)", () => {
  it("debits the principal at creation and credits the matured value", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 14 },
      cash: { openingBalance: 500_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "fd1", type: "FD", name: "FD A", principal: 100_000, rate: 12, startMonth: m("2025-01"), durationMonths: 12 },
      ],
    });
    const { rows, summary } = simulate(config);

    expect(rows[0].assets.cash).toBe(400_000);
    expect(rows[0].assets.fdValue).toBeCloseTo(100_000, 4);
    expect(rows[0].assets.netWorth).toBeCloseTo(500_000, 4);

    const maturityRow = rows[12];
    const maturity = fdValue(100_000, 12, 12);
    expect(maturityRow.events.some((e) => e.type === "FD_MATURED")).toBe(true);
    expect(maturityRow.assets.cash).toBeCloseTo(400_000 + maturity, 2);
    expect(summary.finalNetWorth).toBeCloseTo(400_000 + maturity, 2);
    expect(summary.xirr).toBeNull();
  });

  it("matures a historic FD inside the window without re-debiting principal", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      cash: { openingBalance: 0 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "fd1", type: "FD", name: "Old FD", principal: 100_000, rate: 12, startMonth: m("2024-07"), durationMonths: 12 },
      ],
    });
    const { rows, summary } = simulate(config);

    expect(rows[0].assets.cash).toBe(0);
    expect(rows[0].assets.fdValue).toBeCloseTo(fdValue(100_000, 12, 6), 2);

    const maturity = fdValue(100_000, 12, 12);
    const maturityRow = rows[6];
    expect(maturityRow.month).toBe("2025-07");
    expect(maturityRow.events.some((e) => e.type === "FD_MATURED")).toBe(true);
    expect(maturityRow.assets.cash).toBeCloseTo(maturity, 2);
    expect(maturityRow.assets.fdValue).toBeCloseTo(0, 6);
    expect(summary.finalNetWorth).toBeCloseTo(maturity, 2);
  });
});

describe("simulate — recurring deposits (end to end)", () => {
  it("accrues and pays out an RD at maturity", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 4 },
      cash: { openingBalance: 100_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "rd1", type: "RD", name: "RD A", monthlyContribution: 10_000, rate: 6, startMonth: m("2025-01"), durationMonths: 3 },
      ],
    });
    const { rows, summary } = simulate(config);

    expect(summary.finalNetWorth).toBeCloseTo(70_000 + rdBankMaturity(10_000, 6, 3), 2);
    expect(rows[3].events.some((e) => e.type === "RD_MATURED")).toBe(true);
  });

  it("reflects each RD contribution immediately, keeping net worth whole", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 4 },
      cash: { openingBalance: 100_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "rd1", type: "RD", name: "RD A", monthlyContribution: 10_000, rate: 6, startMonth: m("2025-01"), durationMonths: 3 },
      ],
    });
    const { rows } = simulate(config);

    expect(rows[0].assets.cash).toBe(90_000);
    expect(rows[0].assets.rdValue).toBeCloseTo(10_000, 6);
    expect(rows[0].assets.netWorth).toBeCloseTo(100_000, 6);

    expect(rows[1].assets.rdValue).toBeCloseTo(rdAges(10_000, 6, [1, 0]), 4);
    expect(rows[2].assets.rdValue).toBeCloseTo(rdAges(10_000, 6, [2, 1, 0]), 4);
  });

  it("reflects stacked RD contributions and maturity in instrument cashflow", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 24 },
      cash: { openingBalance: 500_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "rd1", type: "RD", name: "RD June", monthlyContribution: 5_000, rate: 6, startMonth: m("2025-06"), durationMonths: 12 },
        { id: "rd2", type: "RD", name: "RD Sept", monthlyContribution: 5_000, rate: 6, startMonth: m("2025-09"), durationMonths: 12 },
      ],
    });
    const { rows } = simulate(config);
    const flowAt = (month: string) =>
      rows.find((r) => r.month === month)!.cashflow.instrumentFlow;

    expect(flowAt("2025-03")).toBe(0);
    expect(flowAt("2025-06")).toBe(-5_000);
    expect(flowAt("2025-08")).toBe(-5_000);
    expect(flowAt("2025-09")).toBe(-10_000);
    expect(flowAt("2026-05")).toBe(-10_000);

    const maturityRow = rows.find((r) => r.month === "2026-06")!;
    expect(maturityRow.events.some((e) => e.type === "RD_MATURED")).toBe(true);
    expect(maturityRow.cashflow.instrumentFlow).toBeCloseTo(
      rdBankMaturity(5_000, 6, 12) - 5_000,
      2
    );
  });
});

describe("simulate — investment accounts (end to end)", () => {
  it("contributes monthly, computes a sensible XIRR and totals", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      cash: { openingBalance: 200_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [account({ id: "acc-1", startMonth: m("2025-01"), openingBalance: 0, defaultAnnualReturn: 12, defaultMonthlyContribution: 10_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const { summary } = simulate(config);

    expect(summary.accountContributions["acc-1"]).toBe(120_000);
    expect(summary.totalInvestments).toBe(120_000);
    expect(summary.accountXirr["acc-1"]).not.toBeNull();
    expect(summary.accountXirr["acc-1"]!).toBeGreaterThan(11);
    expect(summary.accountXirr["acc-1"]!).toBeLessThan(13);
    expect(summary.xirr!).toBeGreaterThan(11);
  });

  it("clamps a runtime deposit to the cash available that month", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 1 },
      cash: { openingBalance: 5_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [account({ id: "acc-1", startMonth: m("2025-01"), openingBalance: 0, defaultAnnualReturn: 0, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc-1", month: m("2025-01"), amount: 10_000 },
      ],
    };
    const { rows, summary } = simulate(config, overrides);

    expect(rows[0].assets.investmentCorpus).toBe(5_000);
    expect(rows[0].closingBalance).toBe(0);
    expect(summary.investmentDepositsTotal).toBe(10_000);
  });
});
