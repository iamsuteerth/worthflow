// src/engine/annualExpense.ts
import { addMonths, generateMonths, getMonthIndex } from "@/engine/dateUtils";
import type { MonthKey } from "@/types/simulation";

// Largest number of whole-year (ANNUAL) occurrences that can start at
// `startMonth` and still fit within the forecast window (NS-2).
export function getMaxAnnualYears(
  forecastStartMonth: MonthKey,
  totalMonths: number,
  startMonth: MonthKey
): number {
  const months = generateMonths(forecastStartMonth, totalMonths);
  const startIndex = getMonthIndex(startMonth, months);
  if (startIndex < 0) return 0;
  return Math.floor((totalMonths - startIndex) / 12);
}

// Inclusive end month for an ANNUAL recurring expense of `years` occurrences
// starting at `startMonth` (NS-2).
export function deriveAnnualEndMonth(startMonth: MonthKey, years: number): MonthKey {
  return addMonths(startMonth, years * 12 - 1);
}

// True if `years` (>=1) fits within the forecast window for `startMonth`.
export function isValidAnnualYears(
  forecastStartMonth: MonthKey,
  totalMonths: number,
  startMonth: MonthKey,
  years: number
): boolean {
  if (years < 1) return false;
  return years <= getMaxAnnualYears(forecastStartMonth, totalMonths, startMonth);
}

// True if [startMonth, endMonth] is a valid whole-year ANNUAL range within
// the forecast window — used by store-level guards (NS-2).
export function isValidAnnualRange(
  forecastStartMonth: MonthKey,
  totalMonths: number,
  startMonth: MonthKey,
  endMonth: MonthKey
): boolean {
  const months = generateMonths(forecastStartMonth, totalMonths);
  const startIndex = getMonthIndex(startMonth, months);
  const endIndex = getMonthIndex(endMonth, months);
  if (startIndex < 0 || endIndex < 0) return false;

  const span = endIndex - startIndex + 1;
  if (span <= 0 || span % 12 !== 0) return false;

  return isValidAnnualYears(forecastStartMonth, totalMonths, startMonth, span / 12);
}
