import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '@/store/plannerStore';
import { simulate } from '@/engine/simulate';
import { dryRun } from '@/ai/actions/dryRun';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { buildToolContext, headlineSeed, type ToolContext } from '@/ai/tools/context';
import { toolDispatch } from '@/ai/tools/dispatch';
import { ALL_TOOL_DEFS } from '@/ai/tools/defs';
import { TOOL_NAMES } from '@/ai/tools/dispatch';

const cfg = baseConfig({
  forecast: { startMonth: m('2025-01'), totalMonths: 12 },
  investments: {
    accounts: [account({ id: 'acc-1', name: 'Mutual Fund', openingBalance: 100_000, defaultMonthlyContribution: 5_000 })],
    amountOverrides: [],
    returnOverrides: [],
  },
  instruments: [
    { type: 'FD', id: 'fd-1', name: 'Emergency FD', principal: 200_000, rate: 7, startMonth: m('2025-02'), durationMonths: 6 },
  ],
});

let ctx: ToolContext;

function call(name: string, args: Record<string, unknown> = {}) {
  const res = toolDispatch({ id: 't1', name, args }, ctx);
  return { isError: res.isError, data: JSON.parse(res.content) as Record<string, unknown> };
}

beforeEach(() => {
  usePlannerStore.setState({
    baseConfig: cfg,
    config: cfg,
    overrides: {},
    baselineAccountIds: ['acc-1'],
    history: { past: [], future: [] },
  });
  ctx = buildToolContext();
});

describe('tool defs ↔ handlers', () => {
  it('every declared tool has a handler and vice versa', () => {
    const declared = ALL_TOOL_DEFS.map((d) => d.name).sort();
    expect(declared).toEqual([...TOOL_NAMES].sort());
    for (const d of ALL_TOOL_DEFS) {
      expect(d.description.length).toBeGreaterThan(10);
      expect(d.inputSchema).toBeTypeOf('object');
    }
  });
});

describe('read tools return engine-computed values', () => {
  it('get_forecast_summary carries the headline totals', () => {
    const { data } = call('get_forecast_summary');
    expect(typeof data.finalNetWorth).toBe('number');
    expect(data.startMonth).toBe('2025-01');
    expect(data.horizonMonths).toBe(12);
  });

  it('get_month matches simulate() exactly for a mid-forecast month', () => {
    const result = simulate(cfg, {});
    const row = result.rows.find((r) => r.month === '2025-06')!;
    const { data } = call('get_month', { month: '2025-06' });
    expect(data.cash).toBe(Math.round(row.assets.cash));
    expect(data.netWorth).toBe(Math.round(row.assets.netWorth));
    expect(data.investments).toBe(Math.round(row.assets.investmentCorpus));
  });

  it('get_month errors for a month outside the window', () => {
    const { isError, data } = call('get_month', { month: '2099-01' });
    expect(isError).toBe(true);
    expect(String(data.error)).toContain('2025-01');
  });

  it('get_series windows the labels', () => {
    const { data } = call('get_series', { from: '2025-03', to: '2025-05' });
    expect(data.labels).toEqual(['2025-03', '2025-04', '2025-05']);
  });

  it('list_accounts / get_account resolve by name (case-insensitive)', () => {
    const list = call('list_accounts');
    expect((list.data as unknown as Array<{ name: string }>).some((a) => a.name === 'Mutual Fund')).toBe(true);
    expect(call('get_account', { name: 'mutual fund' }).data.name).toBe('Mutual Fund');
    expect(call('get_account', { name: 'Nope' }).isError).toBe(true);
  });

  it('list_instruments / get_instrument expose the FD', () => {
    expect(call('get_instrument', { name: 'Emergency FD' }).data.kind).toBe('FD');
    expect(call('get_instrument', { name: 'ghost' }).isError).toBe(true);
  });

  it('find_lowest_cash matches the simulation summary', () => {
    const result = simulate(cfg, {});
    const { data } = call('find_lowest_cash');
    expect(data.month).toBe(result.summary.lowestBalanceMonth);
    expect(data.amount).toBe(Math.round(result.summary.lowestBalance));
  });

  it('get_scenario_effect reports no active scenario for a base plan', () => {
    expect(call('get_scenario_effect').data.hasActiveScenario).toBe(false);
  });

  it('headlineSeed is compact JSON of the engine headline totals', () => {
    const raw = headlineSeed(ctx);
    expect(raw.length).toBeLessThan(400); // stays a tiny prefix-cache-friendly seed
    const seed = JSON.parse(raw) as Record<string, unknown>;
    expect(seed.startMonth).toBe('2025-01');
    expect(seed.horizonMonths).toBe(12);
    expect(seed.finalNetWorth).toBe(ctx.pack.headline.finalNetWorth);
    expect(seed.lowestCashMonth).toBe(ctx.pack.headline.lowestCashMonth);
  });
});

describe('action tools reuse the Phase-2 pipeline', () => {
  it('simulate_change matches dryRun and never applies', () => {
    const action = { kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-03', amount: 20_000, label: 'Test' };
    const delta = dryRun(action as never)!;
    const { data } = call('simulate_change', action);
    expect(data.applied).toBe(false);
    expect(data.finalNetWorthAfter).toBe(delta.finalNetWorthAfter);
    expect(data.lowestCashAfter).toBe(delta.lowestCashAfter);
    // The live plan is untouched by a simulate.
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('propose_change records a confirmable action without applying', () => {
    const before = ctx.proposedActions.length;
    const { data } = call('propose_change', { kind: 'ADD_BONUS_INCOME', month: '2025-04', amount: 10_000, description: 'Bonus' });
    expect(data.proposed).toBe(true);
    expect(ctx.proposedActions).toHaveLength(before + 1);
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });

  it('propose_change rejects an out-of-window action (no card recorded)', () => {
    const res = call('propose_change', { kind: 'ADD_ONE_OFF_EXPENSE', month: '2099-01', amount: 1, label: 'x' });
    expect(res.isError).toBe(true);
    expect(ctx.proposedActions).toHaveLength(0);
  });
});

describe('toolDispatch safety', () => {
  it('unknown tool name is a graceful error, not a throw', () => {
    const res = toolDispatch({ id: 'x', name: 'no_such_tool', args: {} }, ctx);
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content).error).toContain('no_such_tool');
  });
});
