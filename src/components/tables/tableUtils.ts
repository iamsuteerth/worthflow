import type { FinancialEvent } from "@/types/events";

import { money as _money } from "@/format/money";

export function money(value: number): string {
  return _money(value);
}

export function sumEvents(events: FinancialEvent[], type: string): number {
  return events
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.amount, 0);
}
