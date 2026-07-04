import { usePlannerStore } from '@/store/plannerStore';
import { simulate, type SimulationResult } from '@/engine/simulate';
import { buildContextPack, hasActiveScenario } from '@/ai/context/buildContextPack';
import type { ContextPack } from '@/ai/context/contextPack.types';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

// ---------------------------------------------------------------------------
// ToolContext — the single, per-turn snapshot every tool reads from. Built once
// at the start of an agent turn so all tool calls in that turn share ONE
// simulate() (and one base-run when a scenario is active), keeping the loop cheap
// and internally consistent. Mirrors what contextCache builds for the static
// pack, but exposes the raw SimulationResult so `get_month` can return exact
// values for any month (the pack's series is down-sampled for long horizons).
// ---------------------------------------------------------------------------

export interface ToolContext {
  config: PlannerConfig;
  overrides: PlannerOverrides;
  baseConfig: PlannerConfig;
  baselineAccountIds: string[];
  accountNames: string[];
  scenarioEventIds: string[];
  result: SimulationResult;
  pack: ContextPack;
  // propose_change records validated, confirmable actions here; the agent loop
  // reads them after the turn and attaches the last one to the assistant message
  // (the model never applies anything — the user still must Apply).
  proposedActions: ResolvedProposedAction[];
}

// A tiny (~200-byte) snapshot of the headline totals, seeded into the system
// prompt so the model starts oriented WITHOUT spending a round-trip on
// get_forecast_summary. Everything month/account/instrument-specific still goes
// through tools. These are engine-computed values, so the "numbers come from the
// engine" invariant holds. Kept small + prefix-stable so provider prompt caching
// discounts it across a conversation on the same plan.
export function headlineSeed(ctx: ToolContext): string {
  const h = ctx.pack.headline;
  const meta = ctx.pack.meta;
  return JSON.stringify({
    startMonth: meta.startMonth,
    horizonMonths: meta.horizonMonths,
    hasActiveScenario: meta.hasActiveScenario,
    finalNetWorth: h.finalNetWorth,
    finalCash: h.finalCash,
    finalInvestmentCorpus: h.finalInvestmentCorpus,
    lowestCash: h.lowestCash,
    lowestCashMonth: h.lowestCashMonth,
    portfolioXirrPct: h.portfolioXirrPct,
  });
}

export function buildToolContext(): ToolContext {
  const s = usePlannerStore.getState();
  const result = simulate(s.config, s.overrides);
  const scenarioActive = hasActiveScenario(s.overrides);
  const baseResult = scenarioActive ? simulate(s.baseConfig, {}) : undefined;
  const pack = buildContextPack(result, s.config, s.overrides, s.baselineAccountIds, undefined, baseResult);

  return {
    config: s.config,
    overrides: s.overrides,
    baseConfig: s.baseConfig,
    baselineAccountIds: s.baselineAccountIds,
    accountNames: s.config.investments.accounts.map((a) => a.name),
    scenarioEventIds: (s.overrides.runtimeEvents ?? []).map((e) => e.id),
    result,
    pack,
    proposedActions: [],
  };
}
