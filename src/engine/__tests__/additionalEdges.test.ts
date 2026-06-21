import { describe, it, expect } from "vitest";
import { addMonths, getMonthIndex, generateMonths } from "@/engine/dateUtils";
import { calculateXirr } from "@/engine/calculateXirr";
import { isFdActive, createHistoricalFdPosition, getElapsedMonths } from "@/engine/fd";
import { createHistoricalRdPosition } from "@/engine/rd";
import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";
import { m } from "./factories";

// ─── dateUtils edges ─────────────────────────────────────────────────────────

describe("addMonths — boundary behaviour", () => {
  it("returns the same month for an offset of 0", () => {
    expect(addMonths(m("2025-06"), 0)).toBe("2025-06");
  });

  it("crosses multiple years forward", () => {
    expect(addMonths(m("2025-01"), 25)).toBe("2027-02");
  });

  it("crosses a year backward", () => {
    expect(addMonths(m("2025-01"), -1)).toBe("2024-12");
    expect(addMonths(m("2025-01"), -13)).toBe("2023-12");
  });

  it("crosses multiple years backward", () => {
    expect(addMonths(m("2025-01"), -25)).toBe("2022-12");
  });

  it("lands exactly on December at offset 11", () => {
    expect(addMonths(m("2025-01"), 11)).toBe("2025-12");
  });
});

describe("getMonthIndex", () => {
  const months = generateMonths(m("2025-01"), 12);
  it("returns the index of a present month", () => {
    expect(getMonthIndex(m("2025-01"), months)).toBe(0);
    expect(getMonthIndex(m("2025-12"), months)).toBe(11);
  });
  it("returns -1 for a month not in the list", () => {
    expect(getMonthIndex(m("2026-01"), months)).toBe(-1);
  });
});

// ─── XIRR edges ──────────────────────────────────────────────────────────────

describe("calculateXirr — sign and degenerate cases", () => {
  it("returns a negative rate for a loss-making investment", () => {
    // Invest 100k, receive 80k one year later → −20%.
    const xirr = calculateXirr([
      { amount: -100_000, date: new Date("2025-01-01") },
      { amount: 80_000, date: new Date("2026-01-01") },
    ]);
    expect(xirr).not.toBeNull();
    expect(xirr!).toBeCloseTo(-20, 0);
  });

  it("returns null when all cashflows share the same date", () => {
    const xirr = calculateXirr([
      { amount: -100_000, date: new Date("2025-01-01") },
      { amount: 120_000, date: new Date("2025-01-01") },
    ]);
    expect(xirr).toBeNull();
  });

  it("returns null when there is no sign change", () => {
    const xirr = calculateXirr([
      { amount: 100, date: new Date("2025-01-01") },
      { amount: 200, date: new Date("2026-01-01") },
    ]);
    expect(xirr).toBeNull();
  });
});

// ─── FD helpers ──────────────────────────────────────────────────────────────

const baseFd: FixedDeposit = {
  id: "fd1", type: "FD", name: "FD", principal: 100_000, rate: 10, startMonth: m("2025-01"), durationMonths: 12,
};

describe("isFdActive", () => {
  it("is active from the start month up to (but not including) maturity", () => {
    expect(isFdActive(baseFd, m("2024-12"))).toBe(false);
    expect(isFdActive(baseFd, m("2025-01"))).toBe(true);
    expect(isFdActive(baseFd, m("2025-12"))).toBe(true);
    expect(isFdActive(baseFd, m("2026-01"))).toBe(false); // maturity month
  });
});

describe("getElapsedMonths", () => {
  it("counts months between two keys, including negatives", () => {
    expect(getElapsedMonths(m("2025-01"), m("2025-01"))).toBe(0);
    expect(getElapsedMonths(m("2024-01"), m("2025-03"))).toBe(14);
    expect(getElapsedMonths(m("2025-03"), m("2024-01"))).toBe(-14);
  });
});

describe("createHistoricalFdPosition", () => {
  it("accrues interest from the FD start up to the forecast start", () => {
    const pos = createHistoricalFdPosition(
      { ...baseFd, startMonth: m("2024-01"), durationMonths: 24 },
      m("2025-01")
    );
    // 12 months @ 10%, quarterly compounded → 100k × 1.025^4 ≈ 110,381.
    expect(pos.currentValue).toBeCloseTo(100_000 * Math.pow(1 + 10 / 400, 12 / 3), 4);
    expect(pos.maturityMonth).toBe("2026-01");
    expect(pos.active).toBe(true);
  });
});

describe("createHistoricalRdPosition", () => {
  it("seeds contributions-to-date and the maturity month", () => {
    const rd: RecurringDeposit = {
      id: "rd1", type: "RD", name: "RD", monthlyContribution: 5_000, rate: 6, startMonth: m("2024-07"), durationMonths: 12,
    };
    const pos = createHistoricalRdPosition(rd, m("2025-01"));
    expect(pos.totalContributed).toBe(30_000); // 6 months elapsed × 5k
    expect(pos.maturityMonth).toBe("2025-07");
    expect(pos.currentValue).toBeGreaterThan(0);
  });
});
