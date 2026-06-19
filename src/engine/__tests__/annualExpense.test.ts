import { describe, it, expect } from "vitest";
import {
  getMaxAnnualYears,
  deriveAnnualEndMonth,
  isValidAnnualYears,
  isValidAnnualRange,
} from "@/engine/annualExpense";
import { m } from "./factories";

describe("getMaxAnnualYears", () => {
  it("counts whole years available from the start month to the horizon", () => {
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2025-01"))).toBe(3);
  });

  it("accounts for a later start month", () => {
    // Start at index 12, 24 months remain → 2 whole years.
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2026-01"))).toBe(2);
  });

  it("floors partial years", () => {
    // 30 months total, start at index 0 → floor(30/12) = 2.
    expect(getMaxAnnualYears(m("2025-01"), 30, m("2025-01"))).toBe(2);
  });

  it("returns 0 when the start month is outside the forecast", () => {
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2030-01"))).toBe(0);
  });
});

describe("deriveAnnualEndMonth", () => {
  it("derives the inclusive end month for a whole number of years", () => {
    expect(deriveAnnualEndMonth(m("2025-01"), 1)).toBe("2025-12");
    expect(deriveAnnualEndMonth(m("2025-01"), 2)).toBe("2026-12");
    expect(deriveAnnualEndMonth(m("2025-06"), 1)).toBe("2026-05");
  });
});

describe("isValidAnnualYears", () => {
  it("rejects fewer than one year", () => {
    expect(isValidAnnualYears(m("2025-01"), 36, m("2025-01"), 0)).toBe(false);
  });

  it("accepts a duration within the horizon and rejects one beyond it", () => {
    expect(isValidAnnualYears(m("2025-01"), 36, m("2025-01"), 3)).toBe(true);
    expect(isValidAnnualYears(m("2025-01"), 36, m("2025-01"), 4)).toBe(false);
  });
});

describe("isValidAnnualRange", () => {
  it("accepts a range spanning a whole number of years", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2025-12"))).toBe(true);
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2026-12"))).toBe(true);
  });

  it("rejects a range that is not a multiple of 12 months", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2025-06"))).toBe(false);
  });

  it("rejects months outside the forecast", () => {
    expect(isValidAnnualRange(m("2025-01"), 12, m("2025-01"), m("2026-12"))).toBe(false);
  });

  it("rejects an inverted range", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-12"), m("2025-01"))).toBe(false);
  });
});
