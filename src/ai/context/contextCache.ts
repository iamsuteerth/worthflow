import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';

import { simulate } from '@/engine/simulate';
import { buildContextPack, serializeContextPack, hasActiveScenario } from '@/ai/context/buildContextPack';

// Building the pack re-runs simulate() and serialises the result. plannerStore
// replaces `config`/`overrides` with new object references on every plan change,
// so caching by reference identity skips redundant work when the plan is
// unchanged between turns and keeps the serialised block byte-identical across
// those turns — which lets Gemini's implicit prefix caching discount the repeated
// context. Any real plan edit yields new references and a fresh rebuild (with a
// new contextEpoch).
let _cache: { configRef: unknown; overridesRef: unknown; block: string; epoch: string } | null = null;

export function getContextBlock(
  config: PlannerConfig,
  overrides: PlannerOverrides,
  baselineAccountIds: string[],
  baseConfig: PlannerConfig,
): { block: string; epoch: string } {
  if (_cache && _cache.configRef === config && _cache.overridesRef === overrides) {
    return { block: _cache.block, epoch: _cache.epoch };
  }
  const result = simulate(config, overrides);
  // When a scenario is active, simulate the pure base plan so the pack can carry
  // a grounded base-vs-scenario effect.
  const scenarioActive = hasActiveScenario(overrides);
  const baseResult = scenarioActive ? simulate(baseConfig, {}) : undefined;
  const pack = buildContextPack(result, config, overrides, baselineAccountIds, undefined, baseResult);
  const block = serializeContextPack(pack);
  const epoch = crypto.randomUUID();
  _cache = { configRef: config, overridesRef: overrides, block, epoch };
  return { block, epoch };
}

export function clearContextCache(): void {
  _cache = null;
}
