import { describe, it, expect } from "vitest";
import { getMaxAnnualYears, deriveAnnualEndMonth, isValidAnnualYears, isValidAnnualRange } from "@/engine/annualExpense";
import { m } from "@/engine/__tests__/factories";

describe("getMaxAnnualYears", () => {
  it("counts the annual charges that fit from the start month to the horizon", () => {
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2025-01"))).toBe(3);
  });

  it("accounts for a later start month", () => {
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2026-01"))).toBe(2);
  });

  it("counts a charge that fits even without a full trailing year", () => {
    // 30-month window from 2025-01 ends 2027-06; the anniversary charges 2025-01, 2026-01
    // and 2027-01 all land inside it, so three years fit.
    expect(getMaxAnnualYears(m("2025-01"), 30, m("2025-01"))).toBe(3);
  });

  it("counts a later-start charge that lands on the final month", () => {
    // Window 2025-01..2027-04 (28 months). Start 2025-05 → charges 2025-05, 2026-05, 2027-05?
    // 2027-05 is index 28 which is past the last index 27, so only two fit.
    expect(getMaxAnnualYears(m("2025-01"), 28, m("2025-05"))).toBe(2);
  });

  it("returns 0 when the start month is outside the forecast", () => {
    expect(getMaxAnnualYears(m("2025-01"), 36, m("2030-01"))).toBe(0);
  });
});

describe("deriveAnnualEndMonth", () => {
  it("returns the last annual charge (its anniversary), not a full trailing year", () => {
    expect(deriveAnnualEndMonth(m("2025-01"), 1)).toBe("2025-01");
    expect(deriveAnnualEndMonth(m("2025-01"), 2)).toBe("2026-01");
    expect(deriveAnnualEndMonth(m("2025-01"), 3)).toBe("2027-01");
    expect(deriveAnnualEndMonth(m("2025-06"), 2)).toBe("2026-06");
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
  it("accepts a range whose end is exactly a whole number of years after the start", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2025-01"))).toBe(true); // 1 charge
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2026-01"))).toBe(true); // 2 charges
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2027-01"))).toBe(true); // 3 charges
  });

  it("rejects an end month that is not on an anniversary of the start", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2025-12"))).toBe(false);
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-01"), m("2025-06"))).toBe(false);
  });

  it("rejects months outside the forecast", () => {
    expect(isValidAnnualRange(m("2025-01"), 12, m("2025-01"), m("2026-01"))).toBe(false);
  });

  it("rejects an inverted range", () => {
    expect(isValidAnnualRange(m("2025-01"), 36, m("2025-12"), m("2025-01"))).toBe(false);
  });
});
