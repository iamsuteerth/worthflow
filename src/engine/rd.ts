import type {
  RecurringDeposit,
} from "@/types/instrument";

import type {
  MonthKey,
} from "@/types/simulation";

import {
  addMonths,
} from "@/engine/dateUtils";

import {
  calculateRdValue,
} from "@/engine/rdMath";

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

export function createHistoricalRdPosition(
  rd: RecurringDeposit,
  forecastStart: MonthKey
): RdPosition {
  const start =
    new Date(
      `${rd.startMonth}-01`
    );

  const forecast =
    new Date(
      `${forecastStart}-01`
    );

  const elapsedMonths =
    (forecast.getFullYear() -
      start.getFullYear()) *
    12 +
    (
      forecast.getMonth() -
      start.getMonth()
    );

  const contributedMonths =
    Math.min(
      elapsedMonths,
      rd.durationMonths
    );

  const position: RdPosition = {
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

    totalContributed:
      contributedMonths *
      rd.monthlyContribution,

    currentValue: 0,

    active: true,
  };

  position.currentValue =
    calculateRdValue(
      position,
      addMonths(
        forecastStart,
        -1
      ) as MonthKey
    );

  return position;
}