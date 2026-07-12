import type { MonthKey } from "@/types/simulation";

import { addMonths, generateMonths, getMonthIndex } from "@/engine/dateUtils";

export function getMaxAnnualYears(forecastStartMonth: MonthKey, totalMonths: number, startMonth: MonthKey): number {
  const months = generateMonths(forecastStartMonth, totalMonths);
  const startIndex = getMonthIndex(startMonth, months);
  if (startIndex < 0) return 0;
  // An annual expense charges once per year on the start month's anniversary. It's a
  // point event, so only the LAST charge — at index start + (years-1)*12 — must land
  // inside the window, not a full trailing 12 months. N years fit while
  // start + (N-1)*12 <= last index (totalMonths - 1).
  return 1 + Math.floor((totalMonths - 1 - startIndex) / 12);
}

export function deriveAnnualEndMonth(startMonth: MonthKey, years: number): MonthKey {
  // End month = the last annual charge (its (years-1)th anniversary), not the last month
  // of a full trailing year.
  return addMonths(startMonth, (years - 1) * 12);
}

export function isValidAnnualYears(forecastStartMonth: MonthKey, totalMonths: number, startMonth: MonthKey, years: number): boolean {
  if (years < 1) return false;
  return years <= getMaxAnnualYears(forecastStartMonth, totalMonths, startMonth);
}

export function isValidAnnualRange(forecastStartMonth: MonthKey, totalMonths: number, startMonth: MonthKey, endMonth: MonthKey): boolean {
  const months = generateMonths(forecastStartMonth, totalMonths);
  const startIndex = getMonthIndex(startMonth, months);
  const endIndex = getMonthIndex(endMonth, months);
  if (startIndex < 0 || endIndex < 0) return false;

  // The end month is the last annual charge, so it must fall exactly on an anniversary of
  // the start (a whole number of years later). years = that gap / 12 + 1.
  const gap = endIndex - startIndex;
  if (gap < 0 || gap % 12 !== 0) return false;

  return isValidAnnualYears(forecastStartMonth, totalMonths, startMonth, gap / 12 + 1);
}
