import type { AccountSnapshot } from "@/types/investmentAccount";

export interface AssetSnapshot {
  cash: number;
  investmentCorpus: number;
  fdValue: number;
  rdValue: number;
  netWorth: number;
  accountSnapshots: AccountSnapshot[];
}