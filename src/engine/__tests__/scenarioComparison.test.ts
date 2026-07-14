import { describe, it, expect } from "vitest";

import { account, baseConfig, m } from "./factories";
import { compareScenario } from "@/engine/scenarioComparison";

describe("compareScenario", () => {
  it("reports zero deltas when there are no overrides", () => {
    const delta = compareScenario(baseConfig(), {});
    expect(delta).toEqual({ netWorth: 0, cash: 0, investments: 0 });
  });

  it("reflects a one-off expense as a negative cash and net-worth delta", () => {
    const delta = compareScenario(baseConfig(), {
      runtimeEvents: [{ id: "o1", type: "ONE_OFF_EXPENSE", month: m("2025-02"), amount: 20_000, label: "x" }],
    });
    expect(delta.cash).toBe(-20_000);
    expect(delta.netWorth).toBe(-20_000);
    expect(delta.investments).toBe(0);
  });

  it("reflects extra income as a positive delta", () => {
    const delta = compareScenario(baseConfig(), { incomeMonthly: 120_000 });
    expect(delta.cash).toBe(60_000);
    expect(delta.netWorth).toBe(60_000);
  });

  it("counts a runtime deposit — it moves cash into investments (net worth unchanged)", () => {
    const cfg = baseConfig({
      cash: { openingBalance: 500_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        // 0% return so the corpus equals the deposit exactly — a clean assertion.
        accounts: [account({ defaultAnnualReturn: 0, defaultMonthlyContribution: 0 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });

    const delta = compareScenario(cfg, {
      runtimeEvents: [
        { id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "acc-1", month: m("2025-01"), amount: 100_000 },
      ],
    });

    // A deposit lives in overrides, not the effective config: if compareScenario drops
    // that argument these all read 0 (the bug this guards).
    expect(delta.cash).toBe(-100_000);
    expect(delta.investments).toBe(100_000);
    expect(delta.netWorth).toBe(0);
  });
});
