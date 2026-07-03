import type { FinancialEvent } from "@/types/events";
import type { SimulationState } from "@/types/simulationState";

export interface LifecycleResult {
  state: SimulationState;
  events: FinancialEvent[];
  minCash: number;
}