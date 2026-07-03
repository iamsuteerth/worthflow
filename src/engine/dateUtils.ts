import type { MonthKey } from "@/types/simulation";

export function generateMonths(startMonth: MonthKey, totalMonths: number): MonthKey[] {
  const [yearStr, monthStr] = startMonth.split("-");

  let year = Number(yearStr);
  let month = Number(monthStr);

  const months: MonthKey[] = [];

  for (let i = 0; i < totalMonths; i++) {
    const monthKey = `${year}-${String(month).padStart(2, "0")}` as MonthKey;
    months.push(monthKey);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

export function getMonthIndex(month: MonthKey, months: MonthKey[]): number {
  return months.indexOf(month);
}

export function addMonths(monthKey: MonthKey, offset: number): MonthKey {
  const [yearStr, monthStr] = monthKey.split("-");

  let year = Number(yearStr);
  let month = Number(monthStr);

  month += offset;

  while (month > 12) {
    month -= 12;
    year++;
  }

  while (month < 1) {
    month += 12;
    year--;
  }

  return `${year}-${String(month).padStart(2,"0")}` as MonthKey;
}

export function forecastEndMonth(startMonth: MonthKey, totalMonths: number): MonthKey {
  return addMonths(startMonth, totalMonths - 1);
}
