import type { FdPosition } from "@/engine/fd";
import type { RdPosition } from "@/engine/rd";

export interface SimulationState {
  cash: number;
  investmentCorpus: number; // Flat scalar so FD/RD lifecycle and asset snapshot logic can read it without summing accounts.
  accountBalances: Record<string, number>;
  fds: FdPosition[];
  rds: RdPosition[];
}