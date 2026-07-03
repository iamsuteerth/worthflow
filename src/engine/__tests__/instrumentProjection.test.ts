import type { FinancialEvent } from "@/types/events";

import { describe, it, expect } from "vitest";
import { fdMaturityValue, rdMaturityValue, projectInstrument } from "@/engine/instrumentProjection";
import { simulate } from "@/engine/simulate";
import { baseConfig, m, rdBankMaturity } from "@/engine/__tests__/factories";

function eventAmount(rows: { events: FinancialEvent[] }[], type: string): number {
  for (const row of rows) {
    const ev = row.events.find((e) => e.type === type);
    if (ev) return ev.amount;
  }
  throw new Error(`No ${type} event found`);
}

const fdValue = (principal: number, rate: number, months: number) =>
  principal * Math.pow(1 + rate / 400, months / 3);

describe("fdMaturityValue", () => {
  it("matches the quarterly-compounded bank maturity formula", () => {
    expect(fdMaturityValue(100_000, 12, 12)).toBeCloseTo(fdValue(100_000, 12, 12), 4);
    expect(fdMaturityValue(50_000, 10, 24)).toBeCloseTo(fdValue(50_000, 10, 24), 4);
  });
});

describe("rdMaturityValue", () => {
  it("matches the standard quarterly-compounded bank maturity formula", () => {
    expect(rdMaturityValue(10_000, 6, 3)).toBeCloseTo(rdBankMaturity(10_000, 6, 3), 2);
  });

  it("matches bank quoting for a 2-year RD (HDFC reference)", () => {
    const value = rdMaturityValue(10_000, 6.45, 24);
    expect(value).toBeCloseTo(rdBankMaturity(10_000, 6.45, 24), 2);
    expect(value).toBeGreaterThan(256_000);
    expect(value).toBeLessThan(257_000);
  });
});

describe("projectInstrument", () => {
  it("projects an FD's principal, maturity value and interest", () => {
    const p = projectInstrument({
      id: "fd1", type: "FD", name: "FD", principal: 100_000, rate: 12, startMonth: m("2025-01"), durationMonths: 12,
    });
    expect(p.principal).toBe(100_000);
    expect(p.maturityValue).toBeCloseTo(fdValue(100_000, 12, 12), 4);
    expect(p.interest).toBeCloseTo(fdValue(100_000, 12, 12) - 100_000, 4);
  });

  it("projects an RD's total contribution, maturity value and interest", () => {
    const p = projectInstrument({
      id: "rd1", type: "RD", name: "RD", monthlyContribution: 10_000, rate: 6, startMonth: m("2025-01"), durationMonths: 3,
    });
    expect(p.principal).toBe(30_000);
    expect(p.maturityValue).toBeCloseTo(rdMaturityValue(10_000, 6, 3), 6);
    expect(p.interest).toBeCloseTo(p.maturityValue - 30_000, 6);
  });
});

describe("projection matches the simulated maturity payout", () => {
  it("RD: rdMaturityValue equals the RD_MATURED payout", () => {
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
    const payout = eventAmount(rows, "RD_MATURED");
    expect(payout).toBe(Math.round(rdMaturityValue(10_000, 6, 3)));
  });

  it("FD: fdMaturityValue equals the FD_MATURED payout", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 14 },
      cash: { openingBalance: 500_000 },
      income: { monthly: 0 },
      expenses: { defaultMonthly: 0, overrides: {} },
      instruments: [
        { id: "fd1", type: "FD", name: "FD A", principal: 100_000, rate: 12, startMonth: m("2025-01"), durationMonths: 12 },
      ],
    });
    const { rows } = simulate(config);
    const payout = eventAmount(rows, "FD_MATURED");
    expect(payout).toBe(Math.round(fdMaturityValue(100_000, 12, 12)));
  });
});
