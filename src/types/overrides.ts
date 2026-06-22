import type { MonthKey } from "@/types/simulation";
import type { RuntimeEvent } from "@/types/runtimeEvent";
import type { InvestmentAccount } from "@/types/investmentAccount";

export interface PlannerOverrides {
  incomeMonthly?: number;

  openingBalance?: number;

  forecastMonths?: number;

  // Investment accounts created inside a scenario (a "what-if"). They live here,
  // NOT in baseConfig, so they never leak into the Plan Builder, are cleared by
  // Reset, and travel with the plan on save/export. buildEffectiveConfig materialises
  // them into config.investments.accounts so the engine, deposits and overrides see
  // them exactly like a base account. To make an account permanent, add it in the Builder.
  scenarioAccounts?: InvestmentAccount[];

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