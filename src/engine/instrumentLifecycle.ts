import type {
  PlannerConfig,
} from "@/types/config";

import type {
  MonthKey,
} from "@/types/simulation";

import type {
  LifecycleResult,
} from "@/types/lifecycle";

import type {
  SimulationState,
} from "@/types/simulationState";

import {
  processFdLifecycle,
} from "@/engine/fdLifecycle";

import {
  processRdLifecycle,
} from "@/engine/rdLifecycle";

export function processInstrumentLifecycle(
  state: SimulationState,
  config: PlannerConfig,
  month: MonthKey
): LifecycleResult {
  const fdResult =
    processFdLifecycle(
      state,
      config,
      month
    );

  const rdResult =
    processRdLifecycle(
      fdResult.state,
      config,
      month
    );

  return {
    state:
      rdResult.state,

    events: [
      ...fdResult.events,

      ...rdResult.events,
    ],

    minCash: Math.min(
      fdResult.minCash,
      rdResult.minCash
    ),
  };
}