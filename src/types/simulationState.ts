// src/types/simulationState.ts
import type { FdPosition } from "@/engine/fd";
import type { RdPosition } from "@/engine/rd";

export interface SimulationState {
  cash: number;

  /**
   * Total investment corpus = sum of all account balances.
   * Kept as a flat scalar so existing FD/RD lifecycle code and
   * asset snapshot logic can read it directly.
   */
  investmentCorpus: number;

  /** Per-account balances keyed by account id. */
  accountBalances: Record<string, number>;

  fds: FdPosition[];

  rds: RdPosition[];
}