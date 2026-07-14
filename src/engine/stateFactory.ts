import type { PlannerConfig } from "@/types/config";
import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";
import type { SimulationState } from "@/types/simulationState";

import { addMonths } from "@/engine/dateUtils";
import { createHistoricalFdPosition } from "@/engine/fd";
import { createHistoricalRdPosition } from "@/engine/rd";

export function createInitialState(config: PlannerConfig): SimulationState {
  const forecastStart = config.forecast.startMonth;

  const fds = config.instruments
    .filter(
      (i): i is FixedDeposit =>
        i.type === "FD" &&
        i.startMonth < forecastStart &&
        addMonths(i.startMonth, i.durationMonths) >= forecastStart
    )
    .map((i) => createHistoricalFdPosition(i, forecastStart));

  const rds = config.instruments
    .filter(
      (i): i is RecurringDeposit =>
        i.type === "RD" &&
        i.startMonth < forecastStart &&
        addMonths(i.startMonth, i.durationMonths) >= forecastStart
    )
    .map((i) => createHistoricalRdPosition(i, forecastStart));

  // Account balances are seeded inside the simulation loop when each
  // account's startMonth is reached.
  const accountBalances: Record<string, number> = {};
  for (const account of config.investments.accounts) {
    accountBalances[account.id] = 0;
  }

  return {
    cash: config.cash.openingBalance,
    investmentCorpus: 0,
    accountBalances,
    fds,
    rds,
  };
}