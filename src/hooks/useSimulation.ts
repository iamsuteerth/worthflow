import { useMemo } from "react";
import { simulate }from "@/engine/simulate";
import { usePlannerStore }from "@/store/plannerStore";

export function useSimulation() {
  const config =
    usePlannerStore(
      (state) => state.config
    );

  const overrides =
    usePlannerStore(
      (state) => state.overrides
    );

  return useMemo(
    () => simulate(config, overrides),
    [config, overrides]
  );
}
