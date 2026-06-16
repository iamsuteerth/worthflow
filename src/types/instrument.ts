import type { MonthKey } from "@/types/simulation";

export type Instrument =
  | FixedDeposit
  | RecurringDeposit;

export interface FixedDeposit {
  id: string;

  type: "FD";

  name: string;

  principal: number;

  rate: number;

  startMonth: MonthKey;

  durationMonths: number;
}

export interface RecurringDeposit {
  id: string;

  type: "RD";

  name: string;

  monthlyContribution: number;

  rate: number;

  startMonth: MonthKey;

  durationMonths: number;
}