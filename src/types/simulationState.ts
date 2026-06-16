import type { FdPosition } from "@/engine/fd";
import type { RdPosition } from "@/engine/rd";

export interface SimulationState {
  cash: number;

  // Flat scalar so FD/RD lifecycle and asset snapshot logic can read it without summing accounts.
  investmentCorpus: number;

  accountBalances: Record<string, number>;

  fds: FdPosition[];

  rds: RdPosition[];
}