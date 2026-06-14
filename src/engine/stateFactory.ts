import type {
  PlannerConfig,
} from "@/types/config";

import type {
  SimulationState,
} from "@/types/simulationState";

import {
  addMonths,
} from "@/engine/dateUtils";

import {
  createHistoricalFdPosition,
} from "@/engine/fd";

import {
  createHistoricalRdPosition,
} from "@/engine/rd";

import type {
  FixedDeposit,
  RecurringDeposit,
} from "@/types/instrument";

export function createInitialState(
  config: PlannerConfig
): SimulationState {
  const forecastStart =
    config.forecast.startMonth;

  const fds =
    config.instruments
      .filter(
        (
          instrument
        ): instrument is FixedDeposit =>
          instrument.type === "FD" &&
          instrument.startMonth <
          forecastStart &&
          addMonths(
            instrument.startMonth,
            instrument.durationMonths
          ) >=
          forecastStart
      )
      .map(
        (
          instrument
        ) =>
          createHistoricalFdPosition(
            instrument,
            forecastStart
          )
      );

  const rds =
    config.instruments
      .filter(
        (
          instrument
        ): instrument is RecurringDeposit =>
          instrument.type === "RD" &&
          instrument.startMonth <
          forecastStart &&
          addMonths(
            instrument.startMonth,
            instrument.durationMonths
          ) >=
          forecastStart
      )
      .map(
        (
          instrument
        ) =>
          createHistoricalRdPosition(
            instrument,
            forecastStart
          )
      );

  return {
    cash:
      config.cash.openingBalance,

    investmentCorpus:
      config.investments
        .openingCorpus,

    fds,

    rds,
  };
}