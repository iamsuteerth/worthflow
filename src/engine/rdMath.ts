import type { RdPosition } from "@/engine/rd";
import type { MonthKey } from "@/types/simulation";

/**
 * Value of a Recurring Deposit as of `month`, using the standard Indian-bank
 * convention: each installment earns quarterly-compounded interest (rate / 400
 * per quarter) from its deposit until valuation — matching how banks such as
 * HDFC quote RD maturity values.
 *
 * Accrual is elapsed-based: a just-deposited installment counts immediately but
 * has accrued 0 months (so net worth never dips); by maturity — one month after
 * the final installment — every installment has aged a further month. The age is
 * capped at the duration, so valuing the RD past maturity returns the frozen
 * maturity value.
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
    // installment i (0 = oldest) has accrued this many months
    const accruedMonths = ageCapMonths - i;
    value += position.monthlyContribution * Math.pow(1 + quarterlyRate, accruedMonths / 3);
  }

  return value;
}
