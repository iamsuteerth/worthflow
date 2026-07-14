import { describe, it, expect } from "vitest";

import { baseConfig, account, m } from "@/engine/__tests__/factories";
import { buildAccountSchedule } from "@/engine/accountSchedule";

describe("buildAccountSchedule", () => {
  it("returns empty ranges for an unknown account", () => {
    const schedule = buildAccountSchedule(baseConfig(), "missing");
    expect(schedule).toEqual({ contributionRanges: [], returnRanges: [], beyondForecast: false });
  });

  it("flags accounts whose start month is beyond the forecast horizon", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 3 },
      investments: { accounts: [account({ startMonth: m("2026-01") })], amountOverrides: [], returnOverrides: [] },
    });
    const schedule = buildAccountSchedule(config, "acc-1");
    expect(schedule.beyondForecast).toBe(true);
    expect(schedule.contributionRanges).toHaveLength(0);
  });

  it("collapses a constant contribution into a single range", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultMonthlyContribution: 5_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const schedule = buildAccountSchedule(config, "acc-1");
    expect(schedule.contributionRanges).toEqual([
      { startMonth: "2025-01", endMonth: "2025-12", value: 5_000, source: "DEFAULT", overrideId: undefined },
    ]);
  });

  it("splits the contribution schedule around an override window", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultMonthlyContribution: 5_000 })],
        amountOverrides: [
          { id: "a1", accountId: "acc-1", startMonth: m("2025-04"), endMonth: m("2025-06"), amount: 8_000 },
        ],
        returnOverrides: [],
      },
    });
    const { contributionRanges } = buildAccountSchedule(config, "acc-1");
    expect(contributionRanges).toEqual([
      { startMonth: "2025-01", endMonth: "2025-03", value: 5_000, source: "DEFAULT", overrideId: undefined },
      { startMonth: "2025-04", endMonth: "2025-06", value: 8_000, source: "OVERRIDE", overrideId: "a1" },
      { startMonth: "2025-07", endMonth: "2025-12", value: 5_000, source: "DEFAULT", overrideId: undefined },
    ]);
  });

  it("only schedules months at or after the account's own start month", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 12 },
      investments: {
        accounts: [account({ startMonth: m("2025-06"), defaultMonthlyContribution: 3_000 })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const { contributionRanges } = buildAccountSchedule(config, "acc-1");
    expect(contributionRanges).toHaveLength(1);
    expect(contributionRanges[0].startMonth).toBe("2025-06");
    expect(contributionRanges[0].endMonth).toBe("2025-12");
  });

  it("builds return ranges around a return override", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 6 },
      investments: {
        accounts: [account({ startMonth: m("2025-01"), defaultAnnualReturn: 12 })],
        amountOverrides: [],
        returnOverrides: [
          { id: "r1", accountId: "acc-1", startMonth: m("2025-03"), endMonth: m("2025-04"), annualReturn: 5 },
        ],
      },
    });
    const { returnRanges } = buildAccountSchedule(config, "acc-1");
    expect(returnRanges.map((r) => [r.startMonth, r.endMonth, r.value, r.source])).toEqual([
      ["2025-01", "2025-02", 12, "DEFAULT"],
      ["2025-03", "2025-04", 5, "OVERRIDE"],
      ["2025-05", "2025-06", 12, "DEFAULT"],
    ]);
  });
});
