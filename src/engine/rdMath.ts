import type {
  RdPosition,
} from "./rd";

import type {
  MonthKey,
} from "../types/simulation";

export function calculateRdValue(
  position: RdPosition,
  month: MonthKey
): number {
  const start =
    new Date(
      `${position.startMonth}-01`
    );

  const current =
    new Date(
      `${month}-01`
    );

  const elapsedMonths =
    (current.getFullYear() -
      start.getFullYear()) *
      12 +
    (
      current.getMonth() -
      start.getMonth()
    );

  const contributionCount =
    Math.min(
      elapsedMonths,
      position.durationMonths
    );

  let value = 0;

  for (
    let i = 0;
    i < contributionCount;
    i++
  ) {
    const years =
      (contributionCount - 1 - i) /
      12;

    value +=
      position.monthlyContribution *
      Math.pow(
        1 +
          position.rate /
            100,
        years
      );
  }

  return value;
}