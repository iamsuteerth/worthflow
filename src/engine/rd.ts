import type {
  RecurringDeposit,
} from "../types/instrument";

import type {
  MonthKey,
} from "../types/simulation";

import {
  addMonths,
} from "./dateUtils";

export interface RdPosition {
  id: string;

  name: string;

  monthlyContribution: number;

  rate: number;

  startMonth: MonthKey;

  maturityMonth: MonthKey;

  durationMonths: number;

  totalContributed: number;

  currentValue: number;

  active: boolean;
}

export function createRdPosition(
  rd: RecurringDeposit
): RdPosition {
  return {
    id: rd.id,

    name: rd.name,

    monthlyContribution:
      rd.monthlyContribution,

    rate: rd.rate,

    startMonth:
      rd.startMonth,

    maturityMonth:
      addMonths(
        rd.startMonth,
        rd.durationMonths
      ),

    durationMonths:
      rd.durationMonths,

    totalContributed: 0,

    currentValue: 0,

    active: true,
  };
}