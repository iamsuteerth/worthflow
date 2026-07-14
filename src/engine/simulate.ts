
import type { AssetSnapshot } from "@/types/assets";
import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";
import type {
  RuntimeInvestmentDeposit,
  RuntimeInvestmentWithdrawal,
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
  RuntimeSpendingOverride,
} from "@/types/runtimeEvent";
import type {
  MonthlyCashflow,
  SimulationRow,
  SimulationSummary,
  MonthKey,
} from "@/types/simulation";

import { getAccountContribution, processAccountMonth } from "@/engine/accountSimulation";
import { buildCashflowEvents } from "@/engine/buildCashflowEvents";
import { calculateXirr } from "@/engine/calculateXirr";
import {
  getMonthlyExpense,
  getCreditCardExpense,
  getOneOffExpense,
  getRecurringExpense,
  getMonthlyIncome,
  getBonusIncome,
} from "@/engine/configLookups";
import { generateMonths } from "@/engine/dateUtils";
import { processInstrumentLifecycle } from "@/engine/instrumentLifecycle";
import { createInitialState } from "@/engine/stateFactory";

export interface SimulationResult {
  rows: SimulationRow[];
  summary: SimulationSummary;
}

export function simulate(config: PlannerConfig,overrides?: PlannerOverrides): SimulationResult {
  const months = generateMonths(
    config.forecast.startMonth,
    config.forecast.totalMonths
  );

  const rows: SimulationRow[] = [];
  let state = createInitialState(config);

  const accounts = config.investments.accounts;

  const investmentCashflows: { amount: number; date: Date }[] = [];

  const accountCashflows: Record<string, { amount: number; date: Date }[]> = {};
  for (const account of accounts) {
    accountCashflows[account.id] = [];
  }

  // The opening balance actually funded for each future-dated account (clamped to the
  // cash available at its start month)
  const accountFundedOpening: Record<string, number> = {};

  let lowestCash = state.cash;
  let lowestCashMonth = months[0];

  // A deposit/withdrawal only counts when its account exists and has started
  // An orphaned reference never inflates these totals either.
  const refersToLiveAccount = (accountId: string, month: MonthKey): boolean =>
    accounts.some((a) => a.id === accountId && month >= a.startMonth);

  const investmentDepositsTotal =
    overrides?.runtimeEvents
      ?.filter((e): e is RuntimeInvestmentDeposit =>
        e.type === "INVESTMENT_DEPOSIT" && refersToLiveAccount(e.accountId, e.month)
      )
      .reduce((sum, e) => sum + e.amount, 0) ?? 0;

  const investmentWithdrawalsTotal =
    overrides?.runtimeEvents
      ?.filter((e): e is RuntimeInvestmentWithdrawal =>
        e.type === "INVESTMENT_WITHDRAWAL" && refersToLiveAccount(e.accountId, e.month)
      )
      .reduce((sum, e) => sum + e.amount, 0) ?? 0;

  for (const month of months) {
    const salaryIncome = getMonthlyIncome(config, month);
    const bonusIncome = getBonusIncome(config, month);
    const income = salaryIncome + bonusIncome;

    const flatExpense = getMonthlyExpense(config, month);
    const creditCardExpense = getCreditCardExpense(config, month);
    const oneOffExpense = getOneOffExpense(config, month);
    const recurringExpense = getRecurringExpense(config, month);

    const openingBalance = state.cash;
    let cashFloor = state.cash;

    state.cash += income;
    state.cash -= flatExpense + creditCardExpense + oneOffExpense + recurringExpense;
    cashFloor = Math.min(cashFloor, state.cash);

    const monthDeposits =
      overrides?.runtimeEvents?.filter(
        (e): e is RuntimeInvestmentDeposit =>
          e.type === "INVESTMENT_DEPOSIT" && e.month === month && refersToLiveAccount(e.accountId, month)
      ) ?? [];

    const monthWithdrawals =
      overrides?.runtimeEvents?.filter(
        (e): e is RuntimeInvestmentWithdrawal =>
          e.type === "INVESTMENT_WITHDRAWAL" && e.month === month && refersToLiveAccount(e.accountId, month)
      ) ?? [];

    // Preview this month's total contributions so deposits can be clamped
    // against cash available after contributions.
    const contributionPreview = accounts.reduce((sum, account) => {
      if (month < account.startMonth) return sum;
      return sum + getAccountContribution(config, account.id, month);
    }, 0);

    const cashAfterContrib = state.cash - contributionPreview;

    let remainingCash = Math.max(0, cashAfterContrib);
    let fundedOpeningTotal = 0;
    const seededOpenings: Record<string, number> = {};
    for (const account of accounts) {
      if (account.startMonth === month && month > config.forecast.startMonth) {
        const funded = Math.min(Math.max(0, account.openingBalance), remainingCash);
        remainingCash -= funded;
        fundedOpeningTotal += funded;
        seededOpenings[account.id] = funded;
        accountFundedOpening[account.id] = funded;
      }
    }

    // Discretionary deposits clamp against the cash left after openings.
    const clampedDeposits = monthDeposits.map((deposit) => {
      const amount = Math.min(Math.max(0, deposit.amount), remainingCash);
      remainingCash -= amount;
      return { ...deposit, amount };
    });

    const result = processAccountMonth(
      config,
      state.accountBalances,
      month,
      clampedDeposits,
      monthWithdrawals,
      seededOpenings
    );

    state.cash -= result.totalContribution;
    state.cash -= fundedOpeningTotal;
    // Funded opening balances are an investment outflow, like monthly contributions,
    // so they belong in investmentAmount (keeps the cashflow row reconciling).
    const investmentAmount = result.totalContribution + fundedOpeningTotal;
    cashFloor = Math.min(cashFloor, state.cash);

    for (const deposit of clampedDeposits) {
      state.cash -= deposit.amount;
      cashFloor = Math.min(cashFloor, state.cash);
    }

    const withdrawalProceeds = result.xirrEntries
      .filter((entry) => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    state.cash += withdrawalProceeds;

    // Net runtime deposit/withdrawal cash effect: withdrawal proceeds in, clamped
    // deposits out. (Monthly contributions are tracked separately as investmentAmount.)
    const depositsTotal = clampedDeposits.reduce((sum, d) => sum + d.amount, 0);
    const proceeds = withdrawalProceeds - depositsTotal;

    state.accountBalances = result.accountBalances;
    state.investmentCorpus = Object.values(result.accountBalances).reduce(
      (sum, value) => sum + value,
      0
    );

    investmentCashflows.push(...result.xirrEntries);
    for (const entry of result.xirrEntries) {
      accountCashflows[entry.accountId]?.push({ amount: entry.amount, date: entry.date });
    }

    const cashBeforeInstruments = state.cash;
    const lifecycle = processInstrumentLifecycle(state, config, month);
    state = lifecycle.state;
    cashFloor = Math.min(cashFloor, lifecycle.minCash);
    // The lifecycle only moves cash via FD/RD contributions, principal and
    // maturities, so its net cash delta is exactly this month's instrument flow.
    const instrumentFlow = state.cash - cashBeforeInstruments;

    if (cashFloor < lowestCash) {
      lowestCash = cashFloor;
      lowestCashMonth = month;
    }

    const fdValue = state.fds.reduce((s, fd) => s + fd.currentValue, 0);
    const rdValue = state.rds.reduce((s, rd) => s + rd.currentValue, 0);

    const assets: AssetSnapshot = {
      cash: state.cash,
      investmentCorpus: state.investmentCorpus,
      fdValue,
      rdValue,
      netWorth: state.cash + state.investmentCorpus + fdValue + rdValue,
      accountSnapshots: result.accountSnapshots,
    };

    const totalOutflow =
      flatExpense +
      creditCardExpense +
      oneOffExpense +
      recurringExpense +
      investmentAmount;

    const cashflow: MonthlyCashflow = {
      income,
      flatExpense,
      creditCardExpense,
      oneOffExpense,
      recurringExpense,
      investmentAmount,
      proceeds,
      instrumentFlow,
      totalInflow: income,
      totalOutflow,
    };

    const accountAmountOverrideEvents =
      overrides?.runtimeEvents
        ?.filter(
          (e): e is RuntimeAccountAmountOverride =>
            e.type === "ACCOUNT_AMOUNT_OVERRIDE" && e.startMonth === month
        )
        .map((e) => ({
          id: e.id,
          month,
          type: "ACCOUNT_AMOUNT_OVERRIDE" as const,
          amount: e.amount,
          accountId: e.accountId,
          description: `${accounts.find((a) => a.id === e.accountId)?.name ?? "Account"} • ${e.startMonth} → ${e.endMonth}`,
        })) ?? [];

    const accountReturnOverrideEvents =
      overrides?.runtimeEvents
        ?.filter(
          (e): e is RuntimeAccountReturnOverride =>
            e.type === "ACCOUNT_RETURN_OVERRIDE" && e.startMonth === month
        )
        .map((e) => ({
          id: e.id,
          month,
          type: "ACCOUNT_RETURN_OVERRIDE" as const,
          amount: e.annualReturn,
          accountId: e.accountId,
          description: `${accounts.find((a) => a.id === e.accountId)?.name ?? "Account"} • ${e.startMonth} → ${e.endMonth}`,
        })) ?? [];

    const investmentDepositEvents = monthDeposits.map((e) => ({
      id: e.id,
      month,
      type: "INVESTMENT_DEPOSIT" as const,
      amount: e.amount,
      accountId: e.accountId,
      description: `Deposit → ${accounts.find((a) => a.id === e.accountId)?.name ?? "Account"}`,
    }));

    const investmentWithdrawalEvents = monthWithdrawals.map((e) => ({
      id: e.id,
      month,
      type: "INVESTMENT_WITHDRAWAL" as const,
      amount: e.amount,
      accountId: e.accountId,
      description: `Withdrawal ← ${accounts.find((a) => a.id === e.accountId)?.name ?? "Account"}`,
    }));

    const spendingOverrideEvents =
      overrides?.runtimeEvents
        ?.filter(
          (e): e is RuntimeSpendingOverride =>
            e.type === "SPENDING_OVERRIDE" && e.startMonth === month
        )
        .map((e) => ({
          id: e.id,
          month,
          type: "SPENDING_OVERRIDE" as const,
          amount: e.amount,
          description: `Monthly spend → ₹${e.amount.toLocaleString("en-IN")}/mo`,
          rangeEnd: e.endMonth,
        })) ?? [];

    const accountCreatedEvents = accounts
      .filter((account) => account.startMonth === month)
      .map((account) => ({
        id: `${account.id}-created`,
        month,
        type: "ACCOUNT_CREATED" as const,
        amount: seededOpenings[account.id] ?? account.openingBalance,
        accountId: account.id,
        description: account.name,
      }));

    const events = [
      ...buildCashflowEvents(config, month),
      ...accountCreatedEvents,
      ...accountAmountOverrideEvents,
      ...accountReturnOverrideEvents,
      ...investmentDepositEvents,
      ...investmentWithdrawalEvents,
      ...spendingOverrideEvents,
      ...lifecycle.events,
    ];

    rows.push({
      month,
      openingBalance,
      closingBalance: state.cash,
      cashflow,
      assets,
      events,
    });
  }

  if (rows.length === 0) {
    throw new Error("Simulation produced no rows.");
  }

  const finalRow = rows[rows.length - 1];

  // Final portfolio value is the terminal inflow for XIRR computation.
  investmentCashflows.push({
    amount: finalRow.assets.investmentCorpus,
    date: new Date(`${finalRow.month}-01`),
  });

  const xirr = calculateXirr(investmentCashflows);

  const accountXirr: Record<string, number | null> = {};
  const accountContributions: Record<string, number> = {};

  for (const account of accounts) {
    const flows = accountCashflows[account.id] ?? [];
    accountContributions[account.id] = flows
      .filter((cf) => cf.amount < 0)
      .reduce((sum, cf) => sum - cf.amount, 0);

    const finalSnapshot = finalRow.assets.accountSnapshots.find(
      (snap) => snap.accountId === account.id
    );
    const terminalFlows = [
      ...flows,
      { amount: finalSnapshot?.value ?? 0, date: new Date(`${finalRow.month}-01`) },
    ];
    accountXirr[account.id] = calculateXirr(terminalFlows);
  }

  const summary: SimulationSummary = {
    lowestBalance: lowestCash,
    lowestBalanceMonth: lowestCashMonth,
    finalBalance: finalRow.closingBalance,
    totalIncome: rows.reduce((s, r) => s + r.cashflow.income, 0),
    // Complete spend: flat + credit-card + one-off + recurring. Must match the
    // aggregate `monthExpense` definition (and pair sensibly with the comprehensive
    // totalIncome), so the AI headline never disagrees with the per-year expense totals.
    totalExpenses: rows.reduce(
      (s, r) =>
        s +
        r.cashflow.flatExpense +
        r.cashflow.creditCardExpense +
        r.cashflow.oneOffExpense +
        r.cashflow.recurringExpense,
      0
    ),
    totalInvestments: rows.reduce((s, r) => s + r.cashflow.investmentAmount, 0),
    totalOneOffExpenses: rows.reduce((s, r) => s + r.cashflow.oneOffExpense, 0),
    totalRecurringExpenses: rows.reduce((s, r) => s + r.cashflow.recurringExpense, 0),
    investmentDepositsTotal,
    investmentWithdrawalsTotal,
    xirr,
    accountXirr,
    accountContributions,
    accountFundedOpening,
    finalInvestmentCorpus: finalRow.assets.investmentCorpus,
    finalNetWorth: finalRow.assets.netWorth,
  };

  return { rows, summary };
}
