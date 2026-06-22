import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { baseConfig, account, m } from "./factories";
import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";

// Mirrors the live call path: the store hands simulate the EFFECTIVE config + overrides.
function run(config: PlannerConfig, overrides: PlannerOverrides = {}) {
  return simulate(buildEffectiveConfig(config, overrides), overrides);
}

// A representative, "rich" plan touching every value path.
function richPlan(): PlannerConfig {
  return baseConfig({
    forecast: { startMonth: m("2025-01"), totalMonths: 36 },
    income: { monthly: 120_000 },
    cash: { openingBalance: 400_000 },
    expenses: { defaultMonthly: 70_000, overrides: {} },
    investments: {
      accounts: [
        account({ id: "mf", name: "Mutual Fund", startMonth: m("2025-01"), openingBalance: 100_000, defaultMonthlyContribution: 10_000, defaultAnnualReturn: 12 }),
      ],
      amountOverrides: [],
      returnOverrides: [],
    },
    instruments: [
      { id: "fd1", type: "FD", name: "FD A", principal: 150_000, rate: 7, startMonth: m("2025-03"), durationMonths: 12 },
      { id: "rd1", type: "RD", name: "RD A", monthlyContribution: 5_000, rate: 7, startMonth: m("2025-02"), durationMonths: 18 },
    ],
    bonusIncome: [{ id: "b1", month: m("2025-06"), amount: 50_000, description: "Bonus" }],
    salaryChanges: [{ id: "s1", effectiveMonth: m("2026-01"), newMonthlyIncome: 140_000, description: "Hike" }],
  });
}

describe("value regression — net-worth invariant holds every month", () => {
  it("netWorth always equals cash + investments + FD + RD (base + scenario)", () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: "oe", type: "ONE_OFF_EXPENSE", month: m("2025-08"), amount: 60_000, label: "Trip" },
        { id: "dep", type: "INVESTMENT_DEPOSIT", accountId: "mf", month: m("2025-05"), amount: 20_000 },
        { id: "so", type: "SPENDING_OVERRIDE", startMonth: m("2026-02"), endMonth: m("2026-06"), amount: 90_000 },
      ],
    };
    const res = run(richPlan(), overrides);
    for (const row of res.rows) {
      const { cash, investmentCorpus, fdValue, rdValue, netWorth } = row.assets;
      expect(netWorth).toBeCloseTo(cash + investmentCorpus + fdValue + rdValue, 6);
    }
  });
});

describe("value regression — the account refactors are value-neutral", () => {
  const acctDef = account({
    id: "x", name: "X Fund", startMonth: m("2025-01"),
    openingBalance: 80_000, defaultMonthlyContribution: 6_000, defaultAnnualReturn: 11,
  });

  it("a scenarioAccounts account simulates identically to the same account in baseConfig", () => {
    const inBase = run(
      baseConfig({
        forecast: { startMonth: m("2025-01"), totalMonths: 24 },
        income: { monthly: 100_000 },
        cash: { openingBalance: 300_000 },
        expenses: { defaultMonthly: 60_000, overrides: {} },
        investments: { accounts: [acctDef], amountOverrides: [], returnOverrides: [] },
      }),
    );

    const asScenario = run(
      baseConfig({
        forecast: { startMonth: m("2025-01"), totalMonths: 24 },
        income: { monthly: 100_000 },
        cash: { openingBalance: 300_000 },
        expenses: { defaultMonthly: 60_000, overrides: {} },
        investments: { accounts: [], amountOverrides: [], returnOverrides: [] },
      }),
      { scenarioAccounts: [acctDef] },
    );

    expect(asScenario.summary).toEqual(inBase.summary);
    expect(asScenario.rows.map((r) => r.assets)).toEqual(inBase.rows.map((r) => r.assets));
  });

  it("deleting a base account (deletedAccountIds) is identical to that account never existing", () => {
    const keep = account({ id: "keep", name: "Keep", startMonth: m("2025-01"), openingBalance: 50_000, defaultMonthlyContribution: 4_000, defaultAnnualReturn: 10 });

    const withBoth = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 24 },
      cash: { openingBalance: 300_000 },
      investments: { accounts: [keep, acctDef], amountOverrides: [], returnOverrides: [] },
    });
    const deleted = run(withBoth, { deletedAccountIds: ["x"] });

    const onlyKeep = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 24 },
      cash: { openingBalance: 300_000 },
      investments: { accounts: [keep], amountOverrides: [], returnOverrides: [] },
    });
    const absent = run(onlyKeep, {});

    expect(deleted.summary.finalNetWorth).toBe(absent.summary.finalNetWorth);
    expect(deleted.summary.lowestBalance).toBe(absent.summary.lowestBalance);
    expect(deleted.rows.map((r) => r.assets.netWorth)).toEqual(absent.rows.map((r) => r.assets.netWorth));
  });
});
