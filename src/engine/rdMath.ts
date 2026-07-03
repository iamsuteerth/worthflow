import type { RdPosition } from "@/engine/rd";
import type { MonthKey } from "@/types/simulation";

/**
 * Returns the value of an RD at `month`, using standard Indian-bank quarterly
 * compounding. The value is frozen at maturity.
 */
export function calculateRdValue(position: RdPosition, month: MonthKey): number {
  const start = new Date(`${position.startMonth}-01`);
  const current = new Date(`${month}-01`);

  const elapsedMonths =
    (current.getFullYear() - start.getFullYear()) * 12 +
    (current.getMonth() - start.getMonth());

  if (elapsedMonths < 0) return 0;

  const contributionCount = Math.min(elapsedMonths + 1, position.durationMonths);
  const quarterlyRate = position.rate / 400;
  const ageCapMonths = Math.min(elapsedMonths, position.durationMonths);

  let value = 0;
  for (let i = 0; i < contributionCount; i++) {
    const accruedMonths = ageCapMonths - i;
    value += position.monthlyContribution * Math.pow(1 + quarterlyRate, accruedMonths / 3);
  }

  return value;
}
