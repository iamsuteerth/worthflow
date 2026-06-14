// src/types/simulationState.ts
import type { FdPosition } from "@/engine/fd";
import type { RdPosition } from "@/engine/rd";

export interface SimulationState {
  cash: number;

  investmentCorpus: number;

  fds: FdPosition[];

  rds: RdPosition[];
}