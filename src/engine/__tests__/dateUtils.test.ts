import { describe, it, expect } from "vitest";
import { generateMonths, addMonths } from "@/engine/dateUtils";

describe("generateMonths", () => {
  it("generates the correct number of months", () => {
    const months = generateMonths("2025-01", 3);
    expect(months).toHaveLength(3);
  });

  it("generates sequential months within a year", () => {
    expect(generateMonths("2025-01", 3)).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  it("wraps correctly across a year boundary", () => {
    expect(generateMonths("2025-11", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("wraps correctly across two year boundaries", () => {
    const months = generateMonths("2025-11", 6);
    expect(months).toEqual(["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]);
  });

  it("returns a single month for totalMonths=1", () => {
    expect(generateMonths("2025-06", 1)).toEqual(["2025-06"]);
  });
});

describe("addMonths", () => {
  it("adds months within a year", () => {
    expect(addMonths("2025-01", 3)).toBe("2025-04");
  });

  it("adds months across a year boundary", () => {
    expect(addMonths("2025-10", 4)).toBe("2026-02");
  });

  it("adds exactly 12 months", () => {
    expect(addMonths("2025-01", 12)).toBe("2026-01");
  });

  it("subtracts months within a year", () => {
    expect(addMonths("2025-06", -3)).toBe("2025-03");
  });

  it("subtracts months across a year boundary", () => {
    expect(addMonths("2025-03", -3)).toBe("2024-12");
  });

  it("zero offset returns the same month", () => {
    expect(addMonths("2025-07", 0)).toBe("2025-07");
  });

  it("pads single-digit months with a leading zero", () => {
    expect(addMonths("2025-08", 1)).toBe("2025-09");
    expect(addMonths("2025-09", 1)).toBe("2025-10");
  });
});
