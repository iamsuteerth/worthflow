import type { MonthKey } from "@/types/simulation";

export type Instrument =
  | FixedDeposit
  | RecurringDeposit;

export interface FixedDeposit {
  type: "FD";
  id: string;
  name: string;
  principal: number;
  rate: number;
  startMonth: MonthKey;
  durationMonths: number;
}

export interface RecurringDeposit {
  type: "RD";
  id: string;
  name: string;
  monthlyContribution: number;
  rate: number;
  startMonth: MonthKey;
  durationMonths: number;
}