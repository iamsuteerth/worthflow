// src/engine/scenarioComparison.ts
import { simulate } from "@/engine/simulate";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";

export interface ScenarioDelta {
  netWorth: number;
  cash: number;
  lowestCash: number;
}

export function compareScenario(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides
): ScenarioDelta {
  const base = simulate(baseConfig);
  const scenario = simulate(buildEffectiveConfig(baseConfig, overrides));

  return {
    netWorth:   scenario.summary.finalNetWorth  - base.summary.finalNetWorth,
    cash:       scenario.summary.finalBalance   - base.summary.finalBalance,
    lowestCash: scenario.summary.lowestBalance  - base.summary.lowestBalance,
  };
}