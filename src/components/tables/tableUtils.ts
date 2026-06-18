import { money as _money } from "@/format/money";
import type { FinancialEvent } from "@/types/events";

export function money(value: number): string {
  return _money(value);
}

export function sumEvents(events: FinancialEvent[], type: string): number {
  return events
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.amount, 0);
}

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
