import { describe, it, expect } from "vitest";
import { simulate } from "@/engine/simulate";
import { baseConfig, account, m } from "./factories";

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

    // Before the account starts: cash intact, nothing invested.
    expect(feb.assets.cash).toBe(100_000);
    expect(feb.assets.netWorth).toBe(100_000);

    // At the start month the opening balance moves OUT of cash and INTO the account,
    // so net worth is conserved (previously it jumped to 200k for free).
    expect(mar.assets.cash).toBe(0);
    expect(mar.assets.investmentCorpus).toBe(100_000);
    expect(mar.assets.netWorth).toBe(100_000);

    // The funding shows up as an investment outflow in the start month.
    expect(mar.cashflow.investmentAmount).toBe(100_000);
    expect(summary.totalInvestments).toBe(100_000);
  });

  it("clamps a future-dated opening to available cash (never negative, never magic wealth)", () => {
    const { rows, summary } = simulate(withAccount("2025-03", 100_000, 30_000));
    const mar = rows.find((r) => r.month === "2025-03")!;

    // Like an FD principal, the one-time opening can't exceed cash on hand: only the
    // 30k available funds the account, so cash floors at 0 (never negative) and no
    // wealth is conjured.
    expect(mar.assets.investmentCorpus).toBe(30_000);
    expect(mar.assets.cash).toBe(0);
    expect(mar.assets.netWorth).toBe(30_000);
    // The UI reads the actually-funded opening, not the configured 100k.
    expect(summary.accountFundedOpening["acc-1"]).toBe(30_000);
  });

  it("leaves a forecast-start account's opening balance as pre-existing wealth", () => {
    const { rows } = simulate(withAccount("2025-01", 100_000, 50_000));
    const jan = rows.find((r) => r.month === "2025-01")!;

    // Account starting at the forecast start = wealth already held: seeded with no
    // cash outflow, so cash stays and net worth includes both pools.
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

    // 200k start, no income/expense/return → net worth is conserved while cash moves
    // into B's opening (100k), A's contribution (10k) and the deposit (20k).
    expect(feb.assets.cash).toBe(60_000);
    expect(feb.assets.investmentCorpus).toBe(140_000);
    expect(feb.assets.netWorth).toBe(200_000);
    expect(feb.cashflow.investmentAmount).toBe(110_000); // 10k contribution + 100k funded opening

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
