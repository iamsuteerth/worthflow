import { describe, it, expect } from "vitest";
import { buildCashflowEvents } from "@/engine/buildCashflowEvents";
import { baseConfig, m } from "./factories";

describe("buildCashflowEvents", () => {
  it("returns no events for an empty config", () => {
    expect(buildCashflowEvents(baseConfig(), m("2025-01"))).toEqual([]);
  });

  it("emits a one-off expense event in its month", () => {
    const config = baseConfig({
      oneOffExpenses: [{ id: "o1", month: m("2025-02"), amount: 10_000, label: "Laptop" }],
    });
    expect(buildCashflowEvents(config, m("2025-02"))).toEqual([
      { id: "o1", month: "2025-02", type: "ONE_OFF_EXPENSE", amount: 10_000, description: "Laptop" },
    ]);
    expect(buildCashflowEvents(config, m("2025-01"))).toEqual([]);
  });

  it("emits credit-card, bonus and salary-change events on the right month", () => {
    const config = baseConfig({
      creditCardBills: [{ id: "c1", month: m("2025-03"), amount: 7_000, label: "HDFC" }],
      bonusIncome: [{ id: "b1", month: m("2025-03"), amount: 40_000, description: "Bonus" }],
      salaryChanges: [{ id: "s1", effectiveMonth: m("2025-03"), newMonthlyIncome: 150_000, description: "Raise" }],
    });
    const events = buildCashflowEvents(config, m("2025-03"));
    expect(events.map((e) => e.type).sort()).toEqual(["BONUS_INCOME", "CREDIT_CARD_EXPENSE", "SALARY_CHANGE"]);
    const salary = events.find((e) => e.type === "SALARY_CHANGE");
    expect(salary?.amount).toBe(150_000);
  });

  it("emits a monthly recurring expense for every month in range", () => {
    const config = baseConfig({
      recurringExpenses: [
        { id: "re1", name: "Gym", amount: 2_000, startMonth: m("2025-01"), endMonth: m("2025-12"), frequency: "MONTHLY" },
      ],
    });
    expect(buildCashflowEvents(config, m("2025-05"))).toEqual([
      { id: "re1-2025-05", month: "2025-05", type: "RECURRING_EXPENSE", amount: 2_000, description: "Gym" },
    ]);
  });

  it("emits an annual recurring expense only in its anniversary month", () => {
    const config = baseConfig({
      recurringExpenses: [
        { id: "re1", name: "Insurance", amount: 20_000, startMonth: m("2025-03"), endMonth: m("2027-03"), frequency: "ANNUAL" },
      ],
    });
    expect(buildCashflowEvents(config, m("2025-03"))).toHaveLength(1);
    expect(buildCashflowEvents(config, m("2026-03"))).toHaveLength(1);
    expect(buildCashflowEvents(config, m("2025-04"))).toHaveLength(0);
  });
});
