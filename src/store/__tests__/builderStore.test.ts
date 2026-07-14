import type { MonthKey } from "@/types/simulation";

import { beforeEach, describe, it, expect } from "vitest";

import { useBuilderStore } from "@/store/builderStore";

const m = (s: string) => s as MonthKey;

// Window: 2026-01 .. 2026-12
beforeEach(() => {
  useBuilderStore.getState().reset();
  useBuilderStore.getState().setForecast(m("2026-01"), 12);
});

const s = () => useBuilderStore.getState();
const accounts = () => s().state.investmentAccounts;
const instruments = () => s().state.instruments;
const recurring = () => s().state.recurringExpenses;

describe("builderStore — update mutators", () => {
  it("updateInvestmentAccount replaces fields by id and uniquifies a clashing name", () => {
    s().addInvestmentAccount({ name: "Alpha", startMonth: m("2026-01"), openingBalance: 1000, defaultAnnualReturn: 8, defaultMonthlyContribution: 0 });
    s().addInvestmentAccount({ name: "Beta", startMonth: m("2026-01"), openingBalance: 2000, defaultAnnualReturn: 8, defaultMonthlyContribution: 0 });
    const alphaId = accounts().find((a) => a.name === "Alpha")!.id;

    s().updateInvestmentAccount({ id: alphaId, name: "Beta", startMonth: m("2026-03"), openingBalance: 5000, defaultAnnualReturn: 10, defaultMonthlyContribution: 250 });

    expect(accounts()).toHaveLength(2);
    const updated = accounts().find((a) => a.id === alphaId)!;
    expect(updated.openingBalance).toBe(5000);
    expect(updated.startMonth).toBe("2026-03");
    expect(updated.name).toBe("Beta (2)"); // uniquified against the existing "Beta"
  });

  it("updateInstrument clamps duration to 1..120", () => {
    s().addInstrument({ id: "fd1", type: "FD", name: "SBI", principal: 1000, rate: 7, startMonth: m("2026-01"), durationMonths: 12 });
    s().updateInstrument({ id: "fd1", type: "FD", name: "SBI", principal: 1000, rate: 7, startMonth: m("2026-01"), durationMonths: 999 });
    expect(instruments()[0].durationMonths).toBe(120);
  });

  it("updateRecurringExpense rejects an inverted range and an invalid annual range, keeps valid edits", () => {
    s().addRecurringExpense({ id: "r1", name: "Rent", amount: 1000, startMonth: m("2026-01"), endMonth: m("2026-06"), frequency: "MONTHLY" });

    // Inverted range → ignored (unchanged).
    s().updateRecurringExpense({ id: "r1", name: "Rent", amount: 1000, startMonth: m("2026-06"), endMonth: m("2026-01"), frequency: "MONTHLY" });
    expect(recurring()[0].endMonth).toBe("2026-06");

    // Annual range that isn't a whole number of years → ignored.
    s().updateRecurringExpense({ id: "r1", name: "Rent", amount: 1000, startMonth: m("2026-01"), endMonth: m("2026-05"), frequency: "ANNUAL" });
    expect(recurring()[0].frequency).toBe("MONTHLY");

    // Valid edit → applied.
    s().updateRecurringExpense({ id: "r1", name: "Rent+", amount: 2000, startMonth: m("2026-02"), endMonth: m("2026-08"), frequency: "MONTHLY" });
    expect(recurring()[0]).toMatchObject({ name: "Rent+", amount: 2000, startMonth: "2026-02", endMonth: "2026-08" });
  });
});

describe("builderStore — snapAllIntoWindow", () => {
  it("pulls out-of-window accounts and events into the window, leaves FD/RD alone", () => {
    s().addInvestmentAccount({ name: "Old", startMonth: m("2025-06"), openingBalance: 1000, defaultAnnualReturn: 8, defaultMonthlyContribution: 0 });
    s().addOneOffExpense({ id: "o1", month: m("2027-05"), label: "Late", amount: 500 });
    s().addInstrument({ id: "fd1", type: "FD", name: "SBI", principal: 1000, rate: 7, startMonth: m("2025-01"), durationMonths: 24 });

    s().snapAllIntoWindow();

    expect(accounts()[0].startMonth).toBe("2026-01"); // clamped up to the first month
    expect(s().state.oneOffExpenses[0].month).toBe("2026-12"); // clamped down to the last month
    expect(instruments()[0].startMonth).toBe("2025-01"); // FD untouched (exempt)
  });
});
