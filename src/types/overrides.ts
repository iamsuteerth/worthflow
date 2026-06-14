// src/types/overrides.ts
import type { MonthKey } from "@/types/simulation";
import type { RuntimeEvent } from "@/types/runtimeEvent";

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