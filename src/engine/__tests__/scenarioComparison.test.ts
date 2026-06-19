import { describe, it, expect } from "vitest";
import { compareScenario } from "@/engine/scenarioComparison";
import { baseConfig, m } from "./factories";

describe("compareScenario", () => {
  it("reports zero deltas when there are no overrides", () => {
    const delta = compareScenario(baseConfig(), {});
    expect(delta).toEqual({ netWorth: 0, cash: 0, lowestCash: 0 });
  });

  it("reflects a one-off expense as a negative cash and net-worth delta", () => {
    // 3 months, income 100k, expense 50k; a 20k one-off in month 2.
    const delta = compareScenario(baseConfig(), {
      runtimeEvents: [{ id: "o1", type: "ONE_OFF_EXPENSE", month: m("2025-02"), amount: 20_000, label: "x" }],
    });
    expect(delta.cash).toBe(-20_000);
    expect(delta.netWorth).toBe(-20_000);
  });

  it("reflects extra income as a positive delta", () => {
    const delta = compareScenario(baseConfig(), { incomeMonthly: 120_000 });
    // +20k/month over 3 months = +60k.
    expect(delta.cash).toBe(60_000);
    expect(delta.netWorth).toBe(60_000);
  });
});
