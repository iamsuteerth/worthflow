import type { FinancialEvent } from "@/types/events";

/**
 * Formats a number as Indian-locale currency string (e.g. ₹1,23,456).
 */
export function money(value: number): string {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

/**
 * Sums the `amount` of all events matching a given type.
 */
export function sumEvents(events: FinancialEvent[], type: string): number {
  return events
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Net cash impact of FD/RD instrument events in a month.
 * FD_CREATED and RD_CREATED reduce cash; FD_MATURED and RD_MATURED add cash.
 */
export function netInstrumentFlow(events: FinancialEvent[]): number {
  return events.reduce((sum, e) => {
    switch (e.type) {
      case "FD_CREATED":
      case "RD_CREATED":
        return sum - e.amount;
      case "FD_MATURED":
      case "RD_MATURED":
        return sum + e.amount;
      default:
        return sum;
    }
  }, 0);
}