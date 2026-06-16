import type { MonthKey } from "@/types/simulation";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function generateMonths(
  startMonth: MonthKey,
  totalMonths: number
): MonthKey[] {
  const [yearStr, monthStr] = startMonth.split("-");

  let year = Number(yearStr);
  let month = Number(monthStr);

  const months: MonthKey[] = [];

  for (let i = 0; i < totalMonths; i++) {
    const monthKey =
      `${year}-${String(month).padStart(2, "0")}` as MonthKey;

    months.push(monthKey);

    month++;

    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export function formatMonthLabel(
  monthKey: MonthKey
): string {
  const [yearStr, monthStr] = monthKey.split("-");

  const year = Number(yearStr);
  const month = Number(monthStr);

  return `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`;
}

export function getMonthIndex(
  month: MonthKey,
  months: MonthKey[]
): number {
  return months.indexOf(month);
}

export function addMonths(
  monthKey: MonthKey,
  offset: number
): MonthKey {
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

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}` as MonthKey;
}

export function nextMonth(
  month: string
) {
  const [
    year,
    monthNumber,
  ] =
    month
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      monthNumber - 1,
      1
    );

  date.setMonth(
    date.getMonth() + 1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(
    2,
    "0"
  )}`;
}