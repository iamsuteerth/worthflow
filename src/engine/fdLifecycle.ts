import type { PlannerConfig } from "@/types/config";
import type { LifecycleResult } from "@/types/lifecycle";
import type { MonthKey } from "@/types/simulation";
import type { SimulationState } from "@/types/simulationState";

import { createFdPosition, updateFdPosition } from "@/engine/fd";

export function processFdLifecycle(state: SimulationState, config: PlannerConfig, month: MonthKey): LifecycleResult {
  const result: LifecycleResult = {
    state: {
      ...state,
      fds: [...state.fds],
    },
    events: [],
    minCash: state.cash,
  };

  const nextState = result.state;

  config.instruments.forEach(
    (instrument) => {
      if (
        instrument.type !== "FD"
      ) {
        return;
      }

      if (instrument.startMonth === month && !nextState.fds.some((fd) => fd.id === instrument.id)) {
        nextState.cash -= instrument.principal;

        result.minCash = Math.min(
          result.minCash,
          nextState.cash
        );

        nextState.fds.push(
          createFdPosition(
            instrument
          )
        );

        result.events.push({
          id: `${instrument.id}-created`,
          month,
          type:  "FD_CREATED",
          amount: instrument.principal,
          description: instrument.name,
        });
      }
    }
  );

  nextState.fds =
    nextState.fds.map((fd) =>
      updateFdPosition(
        fd,
        month
      )
    );

  const maturedFds =
    nextState.fds.filter(
      (fd) =>
        fd.maturityMonth ===
        month
    );

  maturedFds.forEach((fd) => {
    nextState.cash += fd.currentValue;

    result.minCash = Math.min(
      result.minCash,
      nextState.cash
    );

    result.events.push({
      id: `${fd.id}-matured`,
      month,
      type: "FD_MATURED",
      amount:
        Math.round(
          fd.currentValue
        ),
      description: fd.name,
    });
  });

  nextState.fds =
    nextState.fds.filter(
      (fd) =>
        fd.maturityMonth !==
        month
    );

  return result;
}