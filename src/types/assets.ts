// src/types/assets.ts
import type { AccountSnapshot } from "@/types/investmentAccount";

export interface AssetSnapshot {
  cash: number;

  /**
   * Total investment corpus (sum of all account balances).
   * Used by net worth calculation and XIRR.
   */
  investmentCorpus: number;

  fdValue: number;

  rdValue: number;

  netWorth: number;

  /** Per-account breakdown, one entry per investment account. */
  accountSnapshots: AccountSnapshot[];
}