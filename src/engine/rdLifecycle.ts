import type {
  PlannerConfig,
} from "@/types/config";

import type {
  LifecycleResult,
} from "@/types/lifecycle";

import type {
  SimulationState,
} from "@/types/simulationState";

import type {
  MonthKey,
} from "@/types/simulation";

import {
  createRdPosition,
} from "@/engine/rd";

import {
  calculateRdValue,
} from "@/engine/rdMath";

export function processRdLifecycle(
  state: SimulationState,
  config: PlannerConfig,
  month: MonthKey
): LifecycleResult {
  const result: LifecycleResult = {
    state: {
      ...state,

      rds: [...state.rds],
    },

    events: [],

    minCash: state.cash,
  };

  const nextState =
    result.state;

  config.instruments.forEach(
    (instrument) => {
      if (
        instrument.type !== "RD"
      ) {
        return;
      }

      if (
        instrument.startMonth ===
        month &&
        !nextState.rds.some(
          (rd) =>
            rd.id ===
            instrument.id
        )
      ) {
        nextState.rds.push(
          createRdPosition(
            instrument
          )
        );

        result.events.push({
          id:
            `${instrument.id}-created`,

          month,

          type:
            "RD_CREATED",

          amount:
            instrument.monthlyContribution,

          description:
            instrument.name,
        });
      }
    }
  );

  nextState.rds =
    nextState.rds.map((rd) => {
      const updated = {
        ...rd,
      };

      if (
        month >= rd.startMonth &&
        month <
        rd.maturityMonth
      ) {
        nextState.cash -=
          rd.monthlyContribution;

        result.minCash = Math.min(
          result.minCash,
          nextState.cash
        );

        updated.totalContributed +=
          rd.monthlyContribution;
      }

      updated.currentValue =
        calculateRdValue(
          updated,
          month
        );

      return updated;
    });

  const maturedRds =
    nextState.rds.filter(
      (rd) =>
        rd.maturityMonth ===
        month
    );

  maturedRds.forEach((rd) => {

    nextState.cash +=
      rd.currentValue;

    result.minCash = Math.min(
      result.minCash,
      nextState.cash
    );

    result.events.push({
      id:
        `${rd.id}-matured`,

      month,

      type:
        "RD_MATURED",

      amount:
        Math.round(
          rd.currentValue
        ),

      description:
        rd.name,
    });
  });

  nextState.rds =
    nextState.rds.filter(
      (rd) =>
        rd.maturityMonth !==
        month
    );

  return result;
}