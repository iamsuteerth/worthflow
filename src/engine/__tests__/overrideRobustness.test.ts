import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { baseConfig, account, m } from "./factories";
import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";

const run = (cfg: PlannerConfig, ov: PlannerOverrides = {}) =>
  simulate(buildEffectiveConfig(cfg, ov), ov);

const invariantHolds = (res: ReturnType<typeof run>) => {
  for (const row of res.rows) {
    const { cash, investmentCorpus, fdValue, rdValue, netWorth } = row.assets;
    expect(netWorth).toBeCloseTo(cash + investmentCorpus + fdValue + rdValue, 6);
  }
};

describe("override robustness — orphaned references are ignored, never crash or skew values", () => {
  it("deposits / withdrawals / overrides targeting a non-existent account change nothing", () => {
    const cfg = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      cash: { openingBalance: 200_000 },
      investments: {
        accounts: [account({ id: "real", name: "Real", startMonth: m("2025-01"), openingBalance: 50_000, defaultMonthlyContribution: 5_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const clean = run(cfg);

    const withOrphans: PlannerOverrides = {
      runtimeEvents: [
        { id: "d", type: "INVESTMENT_DEPOSIT", accountId: "ghost", month: m("2025-03"), amount: 50_000 },
        { id: "w", type: "INVESTMENT_WITHDRAWAL", accountId: "ghost", month: m("2025-04"), amount: 10_000 },
        { id: "ao", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "ghost", startMonth: m("2025-02"), endMonth: m("2025-05"), amount: 9_000 },
        { id: "ro", type: "ACCOUNT_RETURN_OVERRIDE", accountId: "ghost", startMonth: m("2025-02"), endMonth: m("2025-05"), annualReturn: 99 },
      ],
    };
    const dirty = run(cfg, withOrphans);

    expect(dirty.summary.finalNetWorth).toBe(clean.summary.finalNetWorth);
    expect(dirty.rows.map((r) => r.assets.netWorth)).toEqual(clean.rows.map((r) => r.assets.netWorth));
    // …and the summary totals aren't inflated by the orphaned events either.
    expect(dirty.summary.investmentDepositsTotal).toBe(0);
    expect(dirty.summary.investmentWithdrawalsTotal).toBe(0);
    invariantHolds(dirty);
  });

  it("a deposit into a base account that's been deleted in the same scenario is ignored", () => {
    const cfg = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      cash: { openingBalance: 200_000 },
      investments: {
        accounts: [account({ id: "a", name: "A", startMonth: m("2025-01"), openingBalance: 80_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    // Account A deleted, yet a stale deposit still references it → must be skipped.
    const ov: PlannerOverrides = {
      deletedAccountIds: ["a"],
      runtimeEvents: [{ id: "dep", type: "INVESTMENT_DEPOSIT", accountId: "a", month: m("2025-03"), amount: 20_000 }],
    };
    const res = run(cfg, ov);
    expect(res.rows[res.rows.length - 1].assets.accountSnapshots).toHaveLength(0); // A is gone
    expect(res.summary.finalInvestmentCorpus).toBe(0); // deposit ignored, no corpus
    invariantHolds(res);
  });
});

describe("override robustness — the full override stack simulates cleanly together", () => {
  it("scenario account + deleted base account + a deposit, all active at once", () => {
    const cfg = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 18 },
      income: { monthly: 100_000 },
      cash: { openingBalance: 400_000 },
      expenses: { defaultMonthly: 60_000, overrides: {} },
      investments: {
        accounts: [account({ id: "base", name: "Base", startMonth: m("2025-01"), openingBalance: 100_000, defaultMonthlyContribution: 5_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const ov: PlannerOverrides = {
      scenarioAccounts: [account({ id: "scn", name: "Scenario SIP", startMonth: m("2025-02"), openingBalance: 0, defaultMonthlyContribution: 4_000 })],
      deletedAccountIds: ["base"],
      runtimeEvents: [
        { id: "dep", type: "INVESTMENT_DEPOSIT", accountId: "scn", month: m("2025-05"), amount: 20_000 },
        { id: "so", type: "SPENDING_OVERRIDE", startMonth: m("2025-06"), endMonth: m("2025-09"), amount: 40_000 },
      ],
    };
    const res = run(cfg, ov);

    // Effective accounts = the scenario account only (base is hidden).
    expect(res.rows[res.rows.length - 1].assets.accountSnapshots.map((s) => s.accountId)).toEqual(["scn"]);
    invariantHolds(res);
  });
});
