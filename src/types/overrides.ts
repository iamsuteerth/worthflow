import type { MonthKey } from "@/types/simulation";
import type { RuntimeEvent } from "@/types/runtimeEvent";
import type { InvestmentAccount } from "@/types/investmentAccount";

export interface PlannerOverrides {
  incomeMonthly?: number;
  openingBalance?: number;
  forecastMonths?: number;

  // Scenario-only investment accounts. Excluded from baseConfig, reset with the scenario,
  // materialised at runtime, and only permanent if added in the Builder.
  scenarioAccounts?: InvestmentAccount[];

  // Base accounts hidden by a scenario, by id. buildEffectiveConfig filters it (and its base overrides)
  // out of the effective config, and Reset clears this list to bring it back.
  // Symmetric with scenarioAccounts; surfaced as "Removed base acc ×N".
  deletedAccountIds?: string[];

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