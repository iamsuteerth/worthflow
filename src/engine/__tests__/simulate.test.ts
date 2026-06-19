import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import type { PlannerConfig } from "@/types/config";

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

// ─── Row count & month labels ────────────────────────────────────────────────

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

// ─── Cash arithmetic ─────────────────────────────────────────────────────────

describe("simulate — cash arithmetic", () => {
  it("accumulates cash correctly over 3 months (income 100k, expense 50k)", () => {
    // Month 1: 0 + 100k − 50k = 50k
    // Month 2: 50k + 100k − 50k = 100k
    // Month 3: 100k + 100k − 50k = 150k
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

// ─── Salary changes ──────────────────────────────────────────────────────────

describe("simulate — salary changes", () => {
  it("applies a salary change starting from the effective month", () => {
    // Base 100k → 150k from 2025-02
    // Month 1 (Jan): income = 100k, closing = 50k
    // Month 2 (Feb): income = 150k, closing = 50k + 150k − 50k = 150k
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

// ─── One-off expenses ────────────────────────────────────────────────────────

describe("simulate — one-off expenses", () => {
  it("deducts a one-off expense only in its target month", () => {
    // Month 1: 0 + 100k − 50k = 50k
    // Month 2: 50k + 100k − 50k − 20k = 80k   (one-off in Feb)
    // Month 3: 80k + 100k − 50k = 130k
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

// ─── Credit card bills ───────────────────────────────────────────────────────

describe("simulate — credit card bills", () => {
  it("deducts a credit card bill in its target month", () => {
    const config = makeConfig({
      creditCardBills: [{ id: "c1", month: "2025-01", amount: 10_000, label: "HDFC" }],
    });
    const { rows } = simulate(config);
    // Month 1: 0 + 100k − 50k − 10k = 40k
    expect(rows[0].closingBalance).toBe(40_000);
    expect(rows[0].cashflow.creditCardExpense).toBe(10_000);
  });
});

// ─── Bonus income ────────────────────────────────────────────────────────────

describe("simulate — bonus income", () => {
  it("adds bonus income on top of salary in its target month", () => {
    const config = makeConfig({
      bonusIncome: [{ id: "b1", month: "2025-02", amount: 50_000, description: "Annual bonus" }],
    });
    const { rows } = simulate(config);
    // Month 2: income = 100k salary + 50k bonus = 150k
    expect(rows[1].cashflow.income).toBe(150_000);
    expect(rows[1].closingBalance).toBe(50_000 + 150_000 - 50_000); // 150k
  });
});

// ─── Expense overrides ───────────────────────────────────────────────────────

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

// ─── Summary ─────────────────────────────────────────────────────────────────

describe("simulate — summary", () => {
  it("reports correct finalNetWorth", () => {
    const { summary, rows } = simulate(makeConfig());
    expect(summary.finalNetWorth).toBe(rows[rows.length - 1].assets.netWorth);
  });

  it("reports total income as sum of all monthly incomes", () => {
    const { summary } = simulate(makeConfig());
    // 3 months × 100k = 300k
    expect(summary.totalIncome).toBe(300_000);
  });

  it("reports xirr as null when there are no investment cashflows", () => {
    const { summary } = simulate(makeConfig());
    expect(summary.xirr).toBeNull();
  });

  it("tracks the lowest balance across the simulation", () => {
    // Opening = 0; first cashflow always raises balance → lowestBalance = opening (0)
    const { summary } = simulate(makeConfig());
    expect(summary.lowestBalance).toBe(0);
    expect(summary.lowestBalanceMonth).toBe("2025-01");
  });

  it("reports a negative lowestBalance when cash goes below zero", () => {
    // Income 30k, expense 50k, opening 0 → Month 1 closing = -20k
    const config = makeConfig({ income: { monthly: 30_000 }, expenses: { defaultMonthly: 50_000, overrides: {} } });
    const { summary } = simulate(config);
    expect(summary.lowestBalance).toBeLessThan(0);
  });
});
