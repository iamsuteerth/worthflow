import { describe, it, expect } from "vitest";
import { calculateXirr } from "@/engine/calculateXirr";

describe("calculateXirr", () => {
  it("returns null for a single cashflow", () => {
    expect(calculateXirr([{ amount: -100, date: new Date("2025-01-01") }])).toBeNull();
  });

  it("returns null when all cashflows are negative (no return)", () => {
    expect(
      calculateXirr([
        { amount: -100, date: new Date("2025-01-01") },
        { amount: -50, date: new Date("2025-07-01") },
      ])
    ).toBeNull();
  });

  it("returns null when all cashflows are positive (no investment)", () => {
    expect(
      calculateXirr([
        { amount: 100, date: new Date("2025-01-01") },
        { amount: 50, date: new Date("2025-07-01") },
      ])
    ).toBeNull();
  });

  it("computes ~10% XIRR for a simple 1-year invest-and-return", () => {
    const result = calculateXirr([
      { amount: -100_000, date: new Date("2025-01-01") },
      { amount: 110_000, date: new Date("2026-01-01") },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10, 0);
  });

  it("computes ~20% XIRR for a 2-year doubling investment", () => {
    const result = calculateXirr([
      { amount: -100_000, date: new Date("2025-01-01") },
      { amount: 144_000, date: new Date("2027-01-01") },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(20, 0);
  });

  it("returns a positive value when investment grows", () => {
    const result = calculateXirr([
      { amount: -50_000, date: new Date("2025-01-01") },
      { amount: 55_000, date: new Date("2026-01-01") },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it("returns a negative value when investment loses money", () => {
    const result = calculateXirr([
      { amount: -50_000, date: new Date("2025-01-01") },
      { amount: 40_000, date: new Date("2026-01-01") },
    ]);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(0);
  });

  it("handles multiple cashflows correctly", () => {
    const cashflows = Array.from({ length: 12 }, (_, i) => ({
      amount: -10_000,
      date: new Date(2025, i, 1),
    }));
    cashflows.push({ amount: 130_000, date: new Date(2026, 0, 1) });
    const result = calculateXirr(cashflows);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});
