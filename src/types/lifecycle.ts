import type {
  FinancialEvent,
} from "./events";

import type {
  SimulationState,
} from "./simulationState";

export interface LifecycleResult {
  state: SimulationState;

  events: FinancialEvent[];
}