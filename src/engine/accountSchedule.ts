import type { PlannerConfig } from "@/types/config";
import type { MonthKey } from "@/types/simulation";

import { getAccountContribution, getAccountReturn } from "@/engine/accountSimulation";
import { generateMonths } from "@/engine/dateUtils";

export type RangeSource = "DEFAULT" | "OVERRIDE";

export interface ScheduleRange {
  startMonth: MonthKey;
  endMonth: MonthKey;
  value: number;
  source: RangeSource;
  overrideId?: string;
}

export interface AccountSchedule {
  contributionRanges: ScheduleRange[];
  returnRanges: ScheduleRange[];
  beyondForecast: boolean;
}

function collapse(months: MonthKey[], valueOf: (month: MonthKey) => number, sourceOf: (month: MonthKey) => { source: RangeSource; overrideId?: string }): ScheduleRange[] {
  const ranges: ScheduleRange[] = [];

  for (const month of months) {
    const value = valueOf(month);
    const { source, overrideId } = sourceOf(month);
    const last = ranges[ranges.length - 1];

    if (
      last &&
      last.value === value &&
      last.source === source &&
      last.overrideId === overrideId
    ) {
      last.endMonth = month;
    } else {
      ranges.push({ startMonth: month, endMonth: month, value, source, overrideId });
    }
  }

  return ranges;
}

export function buildAccountSchedule(config: PlannerConfig, accountId: string): AccountSchedule {
  const account = config.investments.accounts.find((a) => a.id === accountId);
  if (!account) {
    return { contributionRanges: [], returnRanges: [], beyondForecast: false };
  }

  const forecastMonths = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastEnd = forecastMonths[forecastMonths.length - 1];

  if (account.startMonth > forecastEnd) {
    return { contributionRanges: [], returnRanges: [], beyondForecast: true };
  }

  const months = forecastMonths.filter((m) => m >= account.startMonth);

  const amountOverrides = config.investments.amountOverrides.filter(
    (o) => o.accountId === accountId
  );
  const returnOverrides = config.investments.returnOverrides.filter(
    (o) => o.accountId === accountId
  );

  const contributionRanges = collapse(
    months,
    (m) => getAccountContribution(config, accountId, m),
    (m) => {
      const override = amountOverrides.find((o) => m >= o.startMonth && m <= o.endMonth);
      return override ? { source: "OVERRIDE", overrideId: override.id } : { source: "DEFAULT" };
    }
  );

  const returnRanges = collapse(
    months,
    (m) => getAccountReturn(config, accountId, m),
    (m) => {
      const override = returnOverrides.find((o) => m >= o.startMonth && m <= o.endMonth);
      return override ? { source: "OVERRIDE", overrideId: override.id } : { source: "DEFAULT" };
    }
  );

  return { contributionRanges, returnRanges, beyondForecast: false };
}
