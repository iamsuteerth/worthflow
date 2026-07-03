import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";

import { describe, it, expect } from "vitest";
import { createFdPosition, updateFdPosition, type FdPosition } from "@/engine/fd";
import { calculateRdValue } from "@/engine/rdMath";
import { createRdPosition, type RdPosition } from "@/engine/rd";
import { rdBankMaturity } from "@/engine/__tests__/factories";

const rdAges = (c: number, rate: number, ages: number[]) =>
  ages.reduce((sum, age) => sum + c * Math.pow(1 + rate / 400, age / 3), 0);

const fdValue = (principal: number, rate: number, months: number) =>
  principal * Math.pow(1 + rate / 400, months / 3);

describe("createFdPosition", () => {
  it("starts at principal and derives the maturity month", () => {
    const fd: FixedDeposit = { id: "fd1", type: "FD", name: "FD", principal: 100_000, rate: 7, startMonth: "2025-01", durationMonths: 12 };
    const pos = createFdPosition(fd);
    expect(pos.currentValue).toBe(100_000);
    expect(pos.principal).toBe(100_000);
    expect(pos.maturityMonth).toBe("2026-01");
    expect(pos.active).toBe(true);
  });
});

describe("createRdPosition", () => {
  it("starts empty and derives the maturity month", () => {
    const rd: RecurringDeposit = { id: "rd1", type: "RD", name: "RD", monthlyContribution: 5_000, rate: 6, startMonth: "2025-01", durationMonths: 12 };
    const pos = createRdPosition(rd);
    expect(pos.currentValue).toBe(0);
    expect(pos.totalContributed).toBe(0);
    expect(pos.maturityMonth).toBe("2026-01");
    expect(pos.durationMonths).toBe(12);
    expect(pos.active).toBe(true);
  });
});

function makeFd(overrides: Partial<FdPosition> = {}): FdPosition {
  return {
    id: "fd-1",
    name: "Test FD",
    principal: 100_000,
    currentValue: 100_000,
    rate: 7.2,
    startMonth: "2025-01",
    maturityMonth: "2026-01",
    active: true,
    ...overrides,
  };
}

describe("updateFdPosition", () => {
  it("grows by quarterly compounding after exactly 12 months", () => {
    const result = updateFdPosition(makeFd(), "2026-01");
    expect(result.currentValue).toBeCloseTo(fdValue(100_000, 7.2, 12), 6);
  });

  it("applies compound interest proportionally at 6 months (half-year)", () => {
    const result = updateFdPosition(makeFd(), "2025-07");
    expect(result.currentValue).toBeCloseTo(fdValue(100_000, 7.2, 6), 6);
  });

  it("returns the principal unchanged at the start month (0 elapsed)", () => {
    const result = updateFdPosition(makeFd(), "2025-01");
    expect(result.currentValue).toBeCloseTo(100_000, 0);
  });

  it("preserves all other fields", () => {
    const fd = makeFd();
    const result = updateFdPosition(fd, "2025-07");
    expect(result.id).toBe(fd.id);
    expect(result.principal).toBe(fd.principal);
    expect(result.rate).toBe(fd.rate);
    expect(result.startMonth).toBe(fd.startMonth);
  });

  it("scales correctly for a different rate (10% for 24 months)", () => {
    const fd = makeFd({ principal: 50_000, currentValue: 50_000, rate: 10, startMonth: "2025-01", maturityMonth: "2027-01" });
    const result = updateFdPosition(fd, "2027-01");
    expect(result.currentValue).toBeCloseTo(fdValue(50_000, 10, 24), 6);
  });
});

function makeRd(overrides: Partial<RdPosition> = {}): RdPosition {
  return {
    id: "rd-1",
    name: "Test RD",
    monthlyContribution: 10_000,
    rate: 6,
    startMonth: "2025-01",
    maturityMonth: "2025-04",
    durationMonths: 3,
    totalContributed: 0,
    currentValue: 0,
    active: true,
    ...overrides,
  };
}

describe("calculateRdValue", () => {
  it("values the first contribution immediately on the start month (no lag)", () => {
    expect(calculateRdValue(makeRd(), "2025-01")).toBeCloseTo(10_000, 6);
  });

  it("values two contributions in the second month (quarterly compounding)", () => {
    expect(calculateRdValue(makeRd(), "2025-02")).toBeCloseTo(rdAges(10_000, 6, [1, 0]), 4);
  });

  it("values three contributions in the third month", () => {
    expect(calculateRdValue(makeRd(), "2025-03")).toBeCloseTo(rdAges(10_000, 6, [2, 1, 0]), 4);
  });

  it("pays the bank maturity value one month after the last contribution", () => {
    const atMaturity = calculateRdValue(makeRd(), "2025-04");
    expect(atMaturity).toBeCloseTo(rdBankMaturity(10_000, 6, 3), 2);
    expect(atMaturity).toBeGreaterThan(calculateRdValue(makeRd(), "2025-03"));
  });

  it("caps at durationMonths after the RD has matured", () => {
    const atMaturity = calculateRdValue(makeRd(), "2025-04");
    const pastMaturity = calculateRdValue(makeRd(), "2025-06");
    expect(pastMaturity).toBe(atMaturity);
  });
});
