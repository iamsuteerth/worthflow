import { describe, it, expect } from "vitest";
import { importPlan } from "@/engine/importPlan";
import { calculateChecksum } from "@/engine/checksum";
import { encodeBase64 } from "@/engine/base64";
import { m } from "@/engine/__tests__/factories";
import type { RuntimeEvent } from "@/types/runtimeEvent";

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

describe("importPlan — runtime-event round trip (regression: the import union must not drift)", () => {
  // One representative of EVERY RuntimeEvent type. Typing this as a full Record
  // makes it a COMPILE-TIME exhaustiveness guard: add a new RuntimeEvent kind and
  // this object stops type-checking until it's added here (and, by extension, until
  // the import schema in importPlan.ts is updated to accept it).
  const oneOfEach: Record<RuntimeEvent["type"], RuntimeEvent> = {
    ONE_OFF_EXPENSE: { id: "e1", type: "ONE_OFF_EXPENSE", month: m("2025-02"), amount: 1_000, label: "x" },
    CREDIT_CARD_EXPENSE: { id: "e2", type: "CREDIT_CARD_EXPENSE", month: m("2025-02"), amount: 1_000, label: "x" },
    RECURRING_EXPENSE: { id: "e3", type: "RECURRING_EXPENSE", name: "x", amount: 1_000, startMonth: m("2025-02"), endMonth: m("2025-05"), frequency: "MONTHLY" },
    BONUS_INCOME: { id: "e4", type: "BONUS_INCOME", month: m("2025-03"), amount: 5_000, description: "x" },
    SALARY_CHANGE: { id: "e5", type: "SALARY_CHANGE", effectiveMonth: m("2025-04"), newMonthlyIncome: 120_000, description: "x" },
    ACCOUNT_AMOUNT_OVERRIDE: { id: "e6", type: "ACCOUNT_AMOUNT_OVERRIDE", accountId: "acc-1", startMonth: m("2025-02"), endMonth: m("2025-05"), amount: 2_000 },
    ACCOUNT_RETURN_OVERRIDE: { id: "e7", type: "ACCOUNT_RETURN_OVERRIDE", accountId: "acc-1", startMonth: m("2025-02"), endMonth: m("2025-05"), annualReturn: 8 },
    INVESTMENT_DEPOSIT: { id: "e8", type: "INVESTMENT_DEPOSIT", accountId: "acc-1", month: m("2025-03"), amount: 3_000 },
    INVESTMENT_WITHDRAWAL: { id: "e9", type: "INVESTMENT_WITHDRAWAL", accountId: "acc-1", month: m("2025-04"), amount: 1_000 },
    FD: { id: "e10", type: "FD", name: "FD", principal: 50_000, rate: 7, startMonth: m("2025-02"), durationMonths: 12 },
    RD: { id: "e11", type: "RD", name: "RD", monthlyContribution: 5_000, rate: 7, startMonth: m("2025-02"), durationMonths: 12 },
    SPENDING_OVERRIDE: { id: "e12", type: "SPENDING_OVERRIDE", startMonth: m("2025-02"), endMonth: m("2025-06"), amount: 40_000 },
    OPENING_CASH_OVERRIDE: { id: "e13", type: "OPENING_CASH_OVERRIDE", amount: 99_999 },
  };

  it("round-trips a plan that uses every runtime-event type", async () => {
    const events = Object.values(oneOfEach);
    const file = await makeWfPlanFile({ ...validPlan, overrides: { runtimeEvents: events } });
    const result = await importPlan(file);
    expect(result.overrides.runtimeEvents).toHaveLength(events.length);
    const types = (result.overrides.runtimeEvents ?? []).map((e) => e.type).sort();
    expect(types).toEqual([...events.map((e) => e.type)].sort());
  });

  it("round-trips a SPENDING_OVERRIDE (the H-1 regression)", async () => {
    const file = await makeWfPlanFile({
      ...validPlan,
      overrides: { runtimeEvents: [oneOfEach.SPENDING_OVERRIDE] },
    });
    const result = await importPlan(file);
    expect(result.overrides.runtimeEvents).toEqual([oneOfEach.SPENDING_OVERRIDE]);
  });

  it("round-trips an OPENING_CASH_OVERRIDE (the H-1 regression)", async () => {
    const file = await makeWfPlanFile({
      ...validPlan,
      overrides: { runtimeEvents: [oneOfEach.OPENING_CASH_OVERRIDE] },
    });
    const result = await importPlan(file);
    expect(result.overrides.runtimeEvents).toEqual([oneOfEach.OPENING_CASH_OVERRIDE]);
  });

  it("still rejects a runtime event with an unknown type", async () => {
    const file = await makeWfPlanFile({
      ...validPlan,
      overrides: { runtimeEvents: [{ id: "bad", type: "NOT_A_REAL_TYPE", amount: 1 }] },
    });
    await expect(importPlan(file)).rejects.toThrow("Invalid Plan File");
  });

  it("round-trips a scenario-created (what-if) account in overrides.scenarioAccounts", async () => {
    const scenarioAccount = {
      id: "scn-1",
      name: "What-If SIP",
      startMonth: "2025-03",
      openingBalance: 0,
      defaultAnnualReturn: 12,
      defaultMonthlyContribution: 5_000,
    };
    const file = await makeWfPlanFile({
      ...validPlan,
      overrides: { scenarioAccounts: [scenarioAccount] },
    });
    const result = await importPlan(file);
    expect(result.overrides.scenarioAccounts).toEqual([scenarioAccount]);
    // It must NOT have been folded into the base plan on load.
    expect(result.baseConfig.investments.accounts.map((a) => a.id)).not.toContain("scn-1");
  });

  it("round-trips deletedAccountIds (a hidden base account)", async () => {
    const file = await makeWfPlanFile({
      ...validPlan,
      overrides: { deletedAccountIds: ["acc-1"] },
    });
    const result = await importPlan(file);
    expect(result.overrides.deletedAccountIds).toEqual(["acc-1"]);
    // The base account itself is still present in baseConfig (just hidden by the override).
    expect(result.baseConfig.investments.accounts.map((a) => a.id)).toContain("acc-1");
  });
});
