import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";

import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { simulate } from "@/engine/simulate";

export interface ScenarioDelta {
  netWorth: number;
  cash: number;
  investments: number;
}

export function compareScenario(baseConfig: PlannerConfig, overrides: PlannerOverrides): ScenarioDelta {
  const base = simulate(baseConfig);
  const scenario = simulate(buildEffectiveConfig(baseConfig, overrides), overrides);

  return {
    netWorth:    scenario.summary.finalNetWorth         - base.summary.finalNetWorth,
    cash:        scenario.summary.finalBalance          - base.summary.finalBalance,
    investments: scenario.summary.finalInvestmentCorpus - base.summary.finalInvestmentCorpus,
  };
}