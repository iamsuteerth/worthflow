import type { MonthKey } from "./simulation";
import type { RuntimeEvent } from "./runtimeEvent";

export interface PlannerOverrides {
  incomeMonthly?: number;

  openingBalance?: number;

  forecastMonths?: number;

  monthlyExpenses?: Record<
    MonthKey,
    number
  >;

  creditCardExpenses?: Record<
    MonthKey,
    number
  >;

  oneOffExpenses?: Record<
    MonthKey,
    number
  >;

  runtimeEvents?: RuntimeEvent[];
}