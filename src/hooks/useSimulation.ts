import { useMemo } from "react";

import { simulate }
  from "@/engine/simulate";

import { usePlannerStore }
  from "@/store/plannerStore";

export function useSimulation() {
  const config =
    usePlannerStore(
      (state) => state.config
    );

  const overrides =
    usePlannerStore(
      (state) => state.overrides
    );

  // config and overrides are stable store references that only change when the
  // plan is rebuilt, so this memo recomputes the (relatively expensive) simulation
  // once per change instead of on every render of every consumer.
  return useMemo(
    () => simulate(config, overrides),
    [config, overrides]
  );
}
