import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";

import { describe, it, expect } from "vitest";

import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { simulate } from "@/engine/simulate";

function makeConfig(overrides: Partial<PlannerConfig> = {}): PlannerConfig {
  return {
    forecast: { startMonth: "2025-01", totalMonths: 3 },
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

describe("simulate — ACCOUNT_CREATED events", () => {
  it("emits an ACCOUNT_CREATED event in an account's start month with its opening", () => {
    const cfg = makeConfig({
      cash: { openingBalance: 500_000 },
      investments: {
        accounts: [
          { id: "a1", name: "Index Fund", startMonth: "2025-01", openingBalance: 100_000, defaultAnnualReturn: 12, defaultMonthlyContribution: 0 },
        ],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const { rows } = simulate(cfg);
    const created = rows.flatMap((r) => r.events).filter((e) => e.type === "ACCOUNT_CREATED");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ month: "2025-01", accountId: "a1", amount: 100_000, description: "Index Fund" });
  });

  it("uses the funded (clamped) opening for a future-dated account", () => {
    const cfg = makeConfig({
      forecast: { startMonth: "2025-01", totalMonths: 6 },
      cash: { openingBalance: 30_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [
          { id: "a1", name: "Future", startMonth: "2025-03", openingBalance: 100_000, defaultAnnualReturn: 0, defaultMonthlyContribution: 0 },
        ],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const created = simulate(cfg).rows.flatMap((r) => r.events).find((e) => e.type === "ACCOUNT_CREATED");
    expect(created).toMatchObject({ month: "2025-03", accountId: "a1", amount: 30_000 });
  });

  it("emits ACCOUNT_CREATED for a scenario-created (overrides.scenarioAccounts) account", () => {
    const cfg = makeConfig({ cash: { openingBalance: 200_000 } });
    const overrides: PlannerOverrides = {
      scenarioAccounts: [
        { id: "scn-1", name: "What-If SIP", startMonth: "2025-02", openingBalance: 0, defaultAnnualReturn: 10, defaultMonthlyContribution: 5_000 },
      ],
    };
    const effective = buildEffectiveConfig(cfg, overrides);
    const created = simulate(effective, overrides).rows.flatMap((r) => r.events).find((e) => e.type === "ACCOUNT_CREATED");
    expect(created).toMatchObject({ month: "2025-02", accountId: "scn-1", description: "What-If SIP", amount: 0 });
  });
});

describe("simulate — structure", () => {
  it("produces one row per forecast month", () => {
    const { rows } = simulate(makeConfig({ forecast: { startMonth: "2025-01", totalMonths: 6 } }));
    expect(rows).toHaveLength(6);
  });

  it("assigns the correct month key to each row", () => {
    const { rows } = simulate(makeConfig());
    expect(rows[0].month).toBe("2025-01");
    expect(rows[1].month).toBe("2025-02");
    expect(rows[2].month).toBe("2025-03");
  });

  it("sets openingBalance of each row to the previous row's closingBalance", () => {
    const { rows } = simulate(makeConfig());
    expect(rows[1].openingBalance).toBe(rows[0].closingBalance);
    expect(rows[2].openingBalance).toBe(rows[1].closingBalance);
  });
});

describe("simulate — cash arithmetic", () => {
  it("accumulates cash correctly over 3 months (income 100k, expense 50k)", () => {
    const { rows } = simulate(makeConfig());
    expect(rows[0].closingBalance).toBe(50_000);
    expect(rows[1].closingBalance).toBe(100_000);
    expect(rows[2].closingBalance).toBe(150_000);
  });

  it("starts from a non-zero opening balance", () => {
    const { rows } = simulate(makeConfig({ cash: { openingBalance: 200_000 } }));
    expect(rows[0].openingBalance).toBe(200_000);
    expect(rows[0].closingBalance).toBe(250_000);
  });

  it("net worth equals cash when there are no investments or instruments", () => {
    const { rows } = simulate(makeConfig());
    for (const row of rows) {
      expect(row.assets.netWorth).toBe(row.assets.cash);
      expect(row.assets.investmentCorpus).toBe(0);
      expect(row.assets.fdValue).toBe(0);
      expect(row.assets.rdValue).toBe(0);
    }
  });

  it("reports zero cashflow components when income and expenses are zero", () => {
    const config = makeConfig({ income: { monthly: 0 }, expenses: { defaultMonthly: 0, overrides: {} } });
    const { rows } = simulate(config);
    for (const row of rows) {
      expect(row.cashflow.income).toBe(0);
      expect(row.cashflow.flatExpense).toBe(0);
      expect(row.closingBalance).toBe(0);
    }
  });
});

describe("simulate — salary changes", () => {
  it("applies a salary change starting from the effective month", () => {
    const config = makeConfig({
      salaryChanges: [
        { id: "s1", effectiveMonth: "2025-02", newMonthlyIncome: 150_000, description: "Raise" },
      ],
    });
    const { rows } = simulate(config);
    expect(rows[0].cashflow.income).toBe(100_000);
    expect(rows[0].closingBalance).toBe(50_000);
    expect(rows[1].cashflow.income).toBe(150_000);
    expect(rows[1].closingBalance).toBe(150_000);
  });
});

describe("simulate — one-off expenses", () => {
  it("deducts a one-off expense only in its target month", () => {
    const config = makeConfig({
      oneOffExpenses: [{ id: "o1", month: "2025-02", amount: 20_000, label: "Laptop" }],
    });
    const { rows } = simulate(config);
    expect(rows[0].closingBalance).toBe(50_000);
    expect(rows[1].closingBalance).toBe(80_000);
    expect(rows[2].closingBalance).toBe(130_000);
  });

  it("records the expense in the cashflow for that month", () => {
    const config = makeConfig({
      oneOffExpenses: [{ id: "o1", month: "2025-02", amount: 20_000, label: "Laptop" }],
    });
    const { rows } = simulate(config);
    expect(rows[1].cashflow.oneOffExpense).toBe(20_000);
    expect(rows[0].cashflow.oneOffExpense).toBe(0);
    expect(rows[2].cashflow.oneOffExpense).toBe(0);
  });
});

describe("simulate — credit card bills", () => {
  it("deducts a credit card bill in its target month", () => {
    const config = makeConfig({
      creditCardBills: [{ id: "c1", month: "2025-01", amount: 10_000, label: "HDFC" }],
    });
    const { rows } = simulate(config);
    expect(rows[0].closingBalance).toBe(40_000);
    expect(rows[0].cashflow.creditCardExpense).toBe(10_000);
  });
});

describe("simulate — bonus income", () => {
  it("adds bonus income on top of salary in its target month", () => {
    const config = makeConfig({
      bonusIncome: [{ id: "b1", month: "2025-02", amount: 50_000, description: "Annual bonus" }],
    });
    const { rows } = simulate(config);
    expect(rows[1].cashflow.income).toBe(150_000);
    expect(rows[1].closingBalance).toBe(50_000 + 150_000 - 50_000);
  });
});

describe("simulate — expense overrides", () => {
  it("uses the override expense instead of defaultMonthly for that month", () => {
    const config = makeConfig({
      expenses: { defaultMonthly: 50_000, overrides: { "2025-02": 20_000 } },
    });
    const { rows } = simulate(config);
    expect(rows[0].cashflow.flatExpense).toBe(50_000);
    expect(rows[1].cashflow.flatExpense).toBe(20_000);
    expect(rows[2].cashflow.flatExpense).toBe(50_000);
  });
});

describe("simulate — summary", () => {
  it("reports correct finalNetWorth", () => {
    const { summary, rows } = simulate(makeConfig());
    expect(summary.finalNetWorth).toBe(rows[rows.length - 1].assets.netWorth);
  });

  it("reports total income as sum of all monthly incomes", () => {
    const { summary } = simulate(makeConfig());
    expect(summary.totalIncome).toBe(300_000);
  });

  it("totalExpenses is the complete spend: flat + credit-card + one-off + recurring", () => {
    const config = makeConfig({
      forecast: { startMonth: "2025-01", totalMonths: 3 },
      expenses: { defaultMonthly: 10_000, overrides: {} }, // 3 × 10_000 = 30_000
      creditCardBills: [{ id: "cc1", month: "2025-02", amount: 5_000, label: "CC" }],
      oneOffExpenses: [{ id: "oo1", month: "2025-01", amount: 7_000, label: "Trip" }],
      recurringExpenses: [
        { id: "re1", name: "Gym", amount: 1_000, startMonth: "2025-01", endMonth: "2025-03", frequency: "MONTHLY" }, // 3 × 1_000 = 3_000
      ],
    });
    const { summary } = simulate(config);
    // 30_000 flat + 5_000 credit-card + 7_000 one-off + 3_000 recurring
    expect(summary.totalExpenses).toBe(45_000);
  });

  it("reports xirr as null when there are no investment cashflows", () => {
    const { summary } = simulate(makeConfig());
    expect(summary.xirr).toBeNull();
  });

  it("tracks the lowest balance across the simulation", () => {
    const { summary } = simulate(makeConfig());
    expect(summary.lowestBalance).toBe(0);
    expect(summary.lowestBalanceMonth).toBe("2025-01");
  });

  it("reports a negative lowestBalance when cash goes below zero", () => {
    const config = makeConfig({ income: { monthly: 30_000 }, expenses: { defaultMonthly: 50_000, overrides: {} } });
    const { summary } = simulate(config);
    expect(summary.lowestBalance).toBeLessThan(0);
  });
});

describe("simulate — cashflow reconciliation", () => {
  it("every month's cashflow components sum to the closing balance", () => {
    const config = makeConfig({
      forecast: { startMonth: "2025-01", totalMonths: 6 },
      cash: { openingBalance: 1_000_000 },
      income: { monthly: 100_000 },
      expenses: { defaultMonthly: 30_000, overrides: {} },
      creditCardBills: [{ id: "cc1", month: "2025-02", amount: 15_000, label: "CC" }],
      oneOffExpenses: [{ id: "oo1", month: "2025-03", amount: 25_000, label: "Trip" }],
      recurringExpenses: [{ id: "re1", name: "Gym", amount: 2_000, startMonth: "2025-01", endMonth: "2025-06", frequency: "MONTHLY" }],
      bonusIncome: [{ id: "b1", month: "2025-04", amount: 50_000, description: "Bonus" }],
      investments: {
        accounts: [{ id: "acc1", name: "MF", startMonth: "2025-01", openingBalance: 0, defaultAnnualReturn: 12, defaultMonthlyContribution: 10_000 }],
        amountOverrides: [],
        returnOverrides: [],
      },
      instruments: [
        { id: "fd1", type: "FD", name: "FD", principal: 100_000, rate: 7, startMonth: "2025-02", durationMonths: 3 },
        { id: "rd1", type: "RD", name: "RD", monthlyContribution: 5_000, rate: 6, startMonth: "2025-01", durationMonths: 3 },
      ],
    });
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc1", month: "2025-02", amount: 20_000 },
        { id: "w1", type: "INVESTMENT_WITHDRAWAL", accountId: "acc1", month: "2025-05", amount: 8_000 },
      ],
    };
    const { rows } = simulate(config, overrides);

    for (const row of rows) {
      const c = row.cashflow;
      const reconstructed =
        row.openingBalance +
        c.income -
        c.flatExpense -
        c.creditCardExpense -
        c.oneOffExpense -
        c.recurringExpense -
        c.investmentAmount +
        c.proceeds +
        c.instrumentFlow;
      expect(reconstructed).toBeCloseTo(row.closingBalance, 6);
    }
  });

  it("splits runtime deposits/withdrawals into proceeds; investmentAmount stays contributions-only", () => {
    const config = makeConfig({
      forecast: { startMonth: "2025-01", totalMonths: 3 },
      cash: { openingBalance: 500_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [{ id: "acc1", name: "MF", startMonth: "2025-01", openingBalance: 0, defaultAnnualReturn: 0, defaultMonthlyContribution: 10_000 }],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc1", month: "2025-01", amount: 20_000 },
        { id: "w1", type: "INVESTMENT_WITHDRAWAL", accountId: "acc1", month: "2025-02", amount: 5_000 },
      ],
    };
    const { rows } = simulate(config, overrides);

    expect(rows[0].cashflow.investmentAmount).toBe(10_000);
    expect(rows[0].cashflow.proceeds).toBe(-20_000);
    expect(rows[1].cashflow.investmentAmount).toBe(10_000);
    expect(rows[1].cashflow.proceeds).toBe(5_000);
  });
});
