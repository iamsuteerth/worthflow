import { generateMonths } from "./dateUtils";

import type { AssetSnapshot } from "../types/assets";

import type {
  MonthlyCashflow,
  SimulationRow,
  SimulationSummary,
} from "../types/simulation";

import type {
  PlannerConfig,
} from "../types/config";

import {
  getMonthlyExpense,
  getCreditCardExpense,
  getInvestmentAmount,
  getOneOffExpense,
  getMonthlyIncome,
  getBonusIncome,
} from "./configLookups";

import { createInitialState } from "./stateFactory";

import { processInstrumentLifecycle } from "./instrumentLifecycle";

import { buildCashflowEvents } from "./buildCashflowEvents";

export interface SimulationResult {
  rows: SimulationRow[];
  summary: SimulationSummary;
}

export function simulate(
  config: PlannerConfig
): SimulationResult {
  const months = generateMonths(
    config.forecast.startMonth,
    config.forecast.totalMonths
  );

  const rows: SimulationRow[] = [];

  let state =
    createInitialState(config);

  for (const month of months) {
    const salaryIncome =
      getMonthlyIncome(
        config,
        month
      );

    const bonusIncome =
      getBonusIncome(
        config,
        month
      );

    const income =
      salaryIncome +
      bonusIncome;

    const flatExpense =
      getMonthlyExpense(config, month);

    const creditCardExpense =
      getCreditCardExpense(config, month);

    const oneOffExpense =
      getOneOffExpense(config, month);

    const investmentAmount =
      getInvestmentAmount(config, month);

    const totalOutflow =
      flatExpense +
      creditCardExpense +
      oneOffExpense +
      investmentAmount;

    const totalInflow =
      income;

    const openingBalance =
      state.cash;

    state.cash +=
      totalInflow;

    state.cash -=
      totalOutflow;

    state.investmentCorpus +=
      investmentAmount;

    const lifecycle =
      processInstrumentLifecycle(
        state,
        config,
        month
      );

    state =
      lifecycle.state;

    const fdValue =
      state.fds.reduce(
        (sum, fd) =>
          sum + fd.currentValue,
        0
      );

    const rdValue =
      state.rds.reduce(
        (sum, rd) =>
          sum + rd.currentValue,
        0
      );

    const closingBalance =
      state.cash;

    const assets: AssetSnapshot = {
      cash: state.cash,

      investmentCorpus:
        state.investmentCorpus,

      fdValue,

      rdValue,

      netWorth:
        state.cash +
        state.investmentCorpus +
        fdValue +
        rdValue,
    };

    const cashflow: MonthlyCashflow = {
      income,

      flatExpense,

      creditCardExpense,

      oneOffExpense,

      investmentAmount,

      totalInflow,

      totalOutflow,
    };

    const events = [
      ...buildCashflowEvents(
        config,
        month
      ),

      ...lifecycle.events,
    ];

    events.forEach(
      (event) => {
        if (
          event.type ===
          "RD_MATURED"
        ) {
          console.log(
            "SIM EVENT",
            month,
            event.amount
          );
        }
      }
    );

    rows.push({
      month,

      openingBalance,

      closingBalance,

      cashflow,

      assets,

      events,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      "Simulation produced no rows."
    );
  }

  const lowestRow =
    rows.reduce(
      (
        lowest,
        current
      ) =>
        current.closingBalance <
          lowest.closingBalance
          ? current
          : lowest,
      rows[0]
    );

  const finalRow =
    rows[
    rows.length - 1
    ];

  const summary: SimulationSummary =
  {
    lowestBalance:
      lowestRow.closingBalance,

    lowestBalanceMonth:
      lowestRow.month,

    finalBalance:
      finalRow.closingBalance,

    totalIncome:
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.cashflow.income,
        0
      ),

    totalExpenses:
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.cashflow
            .flatExpense +
          row.cashflow
            .creditCardExpense,
        0
      ),

    totalInvestments:
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.cashflow
            .investmentAmount,
        0
      ),

    totalOneOffExpenses:
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row.cashflow
            .oneOffExpense,
        0
      ),

    finalInvestmentCorpus:
      finalRow.assets
        .investmentCorpus,

    finalNetWorth:
      finalRow.assets
        .netWorth,
  };

  return {
    rows,
    summary,
  };
}