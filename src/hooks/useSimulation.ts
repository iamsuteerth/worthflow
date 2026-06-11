import { simulate }
  from "../engine/simulate";

import { usePlannerStore }
  from "../store/plannerStore";

export function useSimulation() {
  const config =
    usePlannerStore(
      (state) => state.config
    );

  return simulate(config);
}