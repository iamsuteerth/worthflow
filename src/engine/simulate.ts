// src/engine/simulate.ts
import { generateMonths } from "@/engine/dateUtils";

import type { AssetSnapshot } from "@/types/assets";

import type {
  MonthlyCashflow,
  SimulationRow,
  SimulationSummary,
} from "@/types/simulation";

import type {
  PlannerConfig,
} from "@/types/config";

import {
  getMonthlyExpense,
  getCreditCardExpense,
  getInvestmentAmount,
  getOneOffExpense,
  getMonthlyIncome,
  getBonusIncome,
  getInvestmentReturn,
} from "@/engine/configLookups";

import { createInitialState } from "@/engine/stateFactory";

import { processInstrumentLifecycle } from "@/engine/instrumentLifecycle";

import { buildCashflowEvents } from "@/engine/buildCashflowEvents";
import type { PlannerOverrides } from "@/types/overrides";
import type { RuntimeInvestmentDeposit, RuntimeInvestmentWithdrawal } from "@/types/runtimeEvent";

import { calculateXirr } from "@/engine/calculateXirr";

export interface SimulationResult {
  rows: SimulationRow[];
  summary: SimulationSummary;
}

export function simulate(
  config: PlannerConfig,
  overrides?: PlannerOverrides
): SimulationResult {
  const months = generateMonths(
    config.forecast.startMonth,
    config.forecast.totalMonths
  );

  const rows: SimulationRow[] = [];

  let state =
    createInitialState(config);

  const investmentCashflows: {
    amount: number;
    date: Date;
  }[] = [];

  investmentCashflows.push({
    amount:
      -config.investments.openingCorpus,

    date:
      new Date(
        `${config.forecast.startMonth}-01`
      ),
  });

  const investmentDepositsTotal =
    overrides?.runtimeEvents
      ?.filter(
        (event): event is RuntimeInvestmentDeposit =>
          event.type === "INVESTMENT_DEPOSIT"
      )
      .reduce(
        (sum, event) =>
          sum + event.amount,
        0
      ) ?? 0;

  const investmentWithdrawalsTotal =
    overrides?.runtimeEvents
      ?.filter(
        (event): event is RuntimeInvestmentWithdrawal =>
          event.type === "INVESTMENT_WITHDRAWAL"
      )
      .reduce(
        (sum, event) =>
          sum + event.amount,
        0
      ) ?? 0;

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

    const annualReturn =
      getInvestmentReturn(
        config,
        month
      );

    const growthFactor =
      Math.max(
        0,
        1 + annualReturn / 100
      );

    const monthlyReturn =
      Math.pow(
        growthFactor,
        1 / 12
      ) - 1;

    state.investmentCorpus *=
      1 + monthlyReturn;

    const deposits =
      overrides?.runtimeEvents
        ?.filter(
          (
            event
          ): event is RuntimeInvestmentDeposit =>
            event.type ===
            "INVESTMENT_DEPOSIT" &&
            event.month === month
        ) ?? [];

    const withdrawals =
      overrides?.runtimeEvents
        ?.filter(
          (
            event
          ): event is RuntimeInvestmentWithdrawal =>
            event.type ===
            "INVESTMENT_WITHDRAWAL" &&
            event.month === month
        ) ?? [];

    deposits.forEach((deposit) => {
      const actualDeposit = Math.min(
        Math.max(0, deposit.amount),
        Math.max(0, state.cash)
      );

      state.cash -= actualDeposit;

      state.investmentCorpus += actualDeposit;

      if (actualDeposit > 0) {
        investmentCashflows.push({
          amount:
            -actualDeposit,

          date:
            new Date(
              `${month}-01`
            ),
        });
      }
    });

    withdrawals.forEach(
      (withdrawal) => {
        const actualWithdrawal = Math.min(
          Math.max(0, withdrawal.amount),
          Math.max(0, state.investmentCorpus)
        );

        state.investmentCorpus -=
          actualWithdrawal;

        state.cash +=
          actualWithdrawal;

        if (actualWithdrawal > 0) {
          investmentCashflows.push({
            amount:
              actualWithdrawal,

            date:
              new Date(
                `${month}-01`
              ),
          });
        }
      }
    );

    state.investmentCorpus =
      Math.max(
        0,
        state.investmentCorpus
      );

    state.investmentCorpus +=
      investmentAmount;

    if (investmentAmount > 0) {
      investmentCashflows.push({
        amount:
          -investmentAmount,

        date:
          new Date(
            `${month}-01`
          ),
      });
    }

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

    const investmentOverrideEvents =
      overrides?.runtimeEvents
        ?.filter(
          (event) =>
            event.type ===
            "INVESTMENT_OVERRIDE"
        )
        .filter(
          (event) =>
            event.startMonth ===
            month
        )
        .map(
          (event) => ({
            id: event.id,

            month,

            type:
              "INVESTMENT_OVERRIDE" as const,

            amount:
              event.amount,

            description:
              `${event.startMonth} → ${event.endMonth}`,
          })
        ) ?? [];

    const investmentReturnOverrideEvents =
      overrides?.runtimeEvents
        ?.filter(
          (event) =>
            event.type ===
            "INVESTMENT_RETURN_OVERRIDE"
        )
        .filter(
          (event) =>
            event.startMonth ===
            month
        )
        .map(
          (event) => ({
            id: event.id,

            month,

            type:
              "INVESTMENT_RETURN_OVERRIDE" as const,

            amount:
              event.annualReturn,

            description:
              `${event.startMonth} → ${event.endMonth}`,
          })
        ) ?? [];

    const investmentDepositEvents =
      overrides?.runtimeEvents
        ?.filter(
          (event) =>
            event.type ===
            "INVESTMENT_DEPOSIT"
        )
        .filter(
          (event) =>
            event.month === month
        )
        .map(
          (event) => ({
            id: event.id,

            month,

            type:
              "INVESTMENT_DEPOSIT" as const,

            amount:
              event.amount,

            description:
              "Portfolio Deposit",
          })
        ) ?? [];

    const investmentWithdrawalEvents =
      overrides?.runtimeEvents
        ?.filter(
          (event) =>
            event.type ===
            "INVESTMENT_WITHDRAWAL"
        )
        .filter(
          (event) =>
            event.month === month
        )
        .map(
          (event) => ({
            id: event.id,

            month,

            type:
              "INVESTMENT_WITHDRAWAL" as const,

            amount:
              event.amount,

            description:
              "Portfolio Withdrawal",
          })
        ) ?? [];

    const events = [
      ...buildCashflowEvents(
        config,
        month
      ),

      ...investmentOverrideEvents,

      ...investmentReturnOverrideEvents,

      ...investmentDepositEvents,

      ...investmentWithdrawalEvents,

      ...lifecycle.events,
    ];

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

  console.log(
    "final corpus",
    finalRow.assets.investmentCorpus
  );

  investmentCashflows.push({
    amount:
      finalRow.assets.investmentCorpus,
    date:
      new Date(
        `${finalRow.month}-01`
      ),
  });

  console.log(
    "after push",
    investmentCashflows[
    investmentCashflows.length - 1
    ]
  );

  console.log(
    "length",
    investmentCashflows.length
  );

  const xirr =
    calculateXirr(
      investmentCashflows
    );

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

    investmentDepositsTotal,

    investmentWithdrawalsTotal,

    xirr,

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