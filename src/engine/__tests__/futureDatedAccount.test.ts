import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import { baseConfig, account, m } from "@/engine/__tests__/factories";

function withAccount(startMonth: string, openingBalance: number, openingCash: number) {
  return baseConfig({
    forecast: { startMonth: m("2025-01"), totalMonths: 4 },
    income: { monthly: 0 },
    cash: { openingBalance: openingCash },
    expenses: { defaultMonthly: 0, overrides: {} },
    investments: {
      accounts: [
        account({
          id: "acc-1",
          startMonth: m(startMonth),
          openingBalance,
          defaultAnnualReturn: 0,
          defaultMonthlyContribution: 0,
        }),
      ],
      amountOverrides: [],
      returnOverrides: [],
    },
  });
}

describe("simulate — future-dated account opening balance", () => {
  it("funds a future-dated opening balance from cash (no net-worth jump)", () => {
    const { rows, summary } = simulate(withAccount("2025-03", 100_000, 100_000));
    const feb = rows.find((r) => r.month === "2025-02")!;
    const mar = rows.find((r) => r.month === "2025-03")!;

    expect(feb.assets.cash).toBe(100_000);
    expect(feb.assets.netWorth).toBe(100_000);

    expect(mar.assets.cash).toBe(0);
    expect(mar.assets.investmentCorpus).toBe(100_000);
    expect(mar.assets.netWorth).toBe(100_000);

    expect(mar.cashflow.investmentAmount).toBe(100_000);
    expect(summary.totalInvestments).toBe(100_000);
  });

  it("clamps a future-dated opening to available cash (never negative, never magic wealth)", () => {
    const { rows, summary } = simulate(withAccount("2025-03", 100_000, 30_000));
    const mar = rows.find((r) => r.month === "2025-03")!;

    expect(mar.assets.investmentCorpus).toBe(30_000);
    expect(mar.assets.cash).toBe(0);
    expect(mar.assets.netWorth).toBe(30_000);

    expect(summary.accountFundedOpening["acc-1"]).toBe(30_000);
  });

  it("leaves a forecast-start account's opening balance as pre-existing wealth", () => {
    const { rows } = simulate(withAccount("2025-01", 100_000, 50_000));
    const jan = rows.find((r) => r.month === "2025-01")!;

    expect(jan.assets.cash).toBe(50_000);
    expect(jan.assets.investmentCorpus).toBe(100_000);
    expect(jan.assets.netWorth).toBe(150_000);
    expect(jan.cashflow.investmentAmount).toBe(0);
  });

  it("shares the cash budget across a future opening, a contribution and a deposit", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 3 },
      income: { monthly: 0 },
      cash: { openingBalance: 200_000 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [
          account({ id: "a", startMonth: m("2025-01"), openingBalance: 0, defaultAnnualReturn: 0, defaultMonthlyContribution: 10_000 }),
          account({ id: "b", startMonth: m("2025-02"), openingBalance: 100_000, defaultAnnualReturn: 0, defaultMonthlyContribution: 0 }),
        ],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const { rows } = simulate(config, {
      runtimeEvents: [
        { id: "d1", type: "INVESTMENT_DEPOSIT", accountId: "a", month: m("2025-02"), amount: 20_000 },
      ],
    });
    const feb = rows.find((r) => r.month === "2025-02")!;

    expect(feb.assets.cash).toBe(60_000);
    expect(feb.assets.investmentCorpus).toBe(140_000);
    expect(feb.assets.netWorth).toBe(200_000);
    expect(feb.cashflow.investmentAmount).toBe(110_000);

    const c = feb.cashflow;
    const reconciled =
      feb.openingBalance +
      c.income -
      (c.flatExpense + c.creditCardExpense + c.oneOffExpense + c.recurringExpense) -
      c.investmentAmount +
      c.proceeds +
      c.instrumentFlow;
    expect(reconciled).toBeCloseTo(feb.closingBalance, 6);
  });

  it("keeps the cashflow row reconciling at the funding month", () => {
    const { rows } = simulate(withAccount("2025-03", 100_000, 100_000));
    const r = rows.find((row) => row.month === "2025-03")!;
    const c = r.cashflow;
    const reconciled =
      r.openingBalance +
      c.income -
      (c.flatExpense + c.creditCardExpense + c.oneOffExpense + c.recurringExpense) -
      c.investmentAmount +
      c.proceeds +
      c.instrumentFlow;
    expect(reconciled).toBeCloseTo(r.closingBalance, 6);
  });
});
