import { describe, it, expect } from "vitest";
import { importPlan } from "@/engine/importPlan";
import { calculateChecksum } from "@/engine/checksum";
import { encodeBase64 } from "@/engine/base64";

const validPlan = {
  baseConfig: {
    forecast: { startMonth: "2025-01", totalMonths: 12 },
    income: { monthly: 100_000 },
    cash: { openingBalance: 25_000 },
    expenses: { defaultMonthly: 50_000, overrides: { "2025-06": 30_000 } },
    investments: {
      accounts: [
        {
          id: "acc-1",
          name: "MF",
          startMonth: "2025-01",
          openingBalance: 0,
          defaultAnnualReturn: 12,
          defaultMonthlyContribution: 5_000,
        },
      ],
      amountOverrides: [],
      returnOverrides: [],
    },
    creditCardBills: [],
    oneOffExpenses: [],
    recurringExpenses: [],
    instruments: [
      { id: "fd1", type: "FD", name: "FD A", principal: 100_000, rate: 7, startMonth: "2025-01", durationMonths: 12 },
    ],
    salaryChanges: [],
    bonusIncome: [],
  },
  overrides: {},
  savedScenarios: [],
};

/** Reproduces exportPlan's wrapper format so we can round-trip through importPlan. */
async function makeWfPlanFile(
  data: unknown,
  { name = "plan.wfplan", corruptChecksum = false, payload }: { name?: string; corruptChecksum?: boolean; payload?: string } = {}
): Promise<File> {
  const encoded = payload ?? encodeBase64(JSON.stringify(data));
  const checksum = corruptChecksum ? "deadbeef" : await calculateChecksum(encoded);
  const wrapper = {
    app: "wealth-forecast",
    version: 3,
    exportedAt: new Date().toISOString(),
    payload: encoded,
    checksum,
  };
  return new File([JSON.stringify(wrapper)], name, { type: "application/octet-stream" });
}

describe("importPlan — happy path", () => {
  it("round-trips a valid plan", async () => {
    const file = await makeWfPlanFile(validPlan);
    const result = await importPlan(file);

    expect(result.baseConfig.forecast).toEqual({ startMonth: "2025-01", totalMonths: 12 });
    expect(result.baseConfig.cash.openingBalance).toBe(25_000);
    expect(result.baseConfig.expenses.overrides).toEqual({ "2025-06": 30_000 });
    expect(result.baseConfig.investments.accounts).toHaveLength(1);
    expect(result.baseConfig.instruments[0]).toMatchObject({ type: "FD", principal: 100_000 });
    expect(result.savedScenarios).toEqual([]);
  });

  it("round-trips a plan containing non-Latin1 text (₹, emoji, regional scripts)", async () => {
    const unicodePlan = {
      ...validPlan,
      baseConfig: {
        ...validPlan.baseConfig,
        investments: {
          ...validPlan.baseConfig.investments,
          accounts: [
            { ...validPlan.baseConfig.investments.accounts[0], name: "नया खाता 🎉" },
          ],
        },
        oneOffExpenses: [
          { id: "o1", month: "2025-03", label: "Café ₹ treat", amount: 500 },
        ],
      },
    };
    const file = await makeWfPlanFile(unicodePlan);
    const result = await importPlan(file);
    expect(result.baseConfig.investments.accounts[0].name).toBe("नया खाता 🎉");
    expect(result.baseConfig.oneOffExpenses[0].label).toBe("Café ₹ treat");
  });

  it("defaults a missing recurringExpenses array to empty", async () => {
    const baseWithout: Record<string, unknown> = { ...validPlan.baseConfig };
    delete baseWithout.recurringExpenses;
    const file = await makeWfPlanFile({ ...validPlan, baseConfig: baseWithout });
    const result = await importPlan(file);
    expect(result.baseConfig.recurringExpenses).toEqual([]);
  });
});

describe("importPlan — rejections", () => {
  it("rejects a non-.wfplan file", async () => {
    const file = await makeWfPlanFile(validPlan, { name: "plan.txt" });
    await expect(importPlan(file)).rejects.toThrow("Invalid plan file");
  });

  it("rejects an empty payload", async () => {
    const file = await makeWfPlanFile(validPlan, { payload: "" });
    await expect(importPlan(file)).rejects.toThrow("Empty plan");
  });

  it("rejects a tampered payload (checksum mismatch)", async () => {
    const file = await makeWfPlanFile(validPlan, { corruptChecksum: true });
    await expect(importPlan(file)).rejects.toThrow("Invalid checksum");
  });

  it("rejects content that fails schema validation", async () => {
    const file = await makeWfPlanFile({ baseConfig: { nonsense: true }, overrides: {} });
    await expect(importPlan(file)).rejects.toThrow("Invalid Plan File");
  });

  it("rejects a wrapper with the wrong app/version envelope", async () => {
    const wrapper = { app: "something-else", version: 1, exportedAt: "now", payload: "x", checksum: "y" };
    const file = new File([JSON.stringify(wrapper)], "plan.wfplan");
    await expect(importPlan(file)).rejects.toThrow();
  });
});
