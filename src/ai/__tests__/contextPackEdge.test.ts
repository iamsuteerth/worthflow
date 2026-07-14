import type { Instrument } from '@/types/instrument';
import type { PlannerOverrides } from '@/types/overrides';

import { describe, it, expect } from 'vitest';

import { MAX_CONTEXT_PACK_BYTES } from '@/ai/config';
import { buildContextPack, serializeContextPack, hasActiveScenario } from '@/ai/context/buildContextPack';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { simulate } from '@/engine/simulate';

describe('buildContextPack — scenarioChanges numbering', () => {
  it('stays 1-based and index-aligned with runtimeEvents order across mixed kinds', () => {
    const cfg = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 12 },
      investments: { accounts: [account({ id: 'acc-1', name: 'NPS' })], amountOverrides: [], returnOverrides: [] },
    });
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'e1', type: 'BONUS_INCOME', month: m('2025-03'), amount: 50_000, description: 'bonus' },
        { id: 'e2', type: 'INVESTMENT_DEPOSIT', accountId: 'acc-1', month: m('2025-04'), amount: 10_000 },
        { id: 'e3', type: 'INVESTMENT_DEPOSIT', accountId: 'ghost', month: m('2025-05'), amount: 1_000 },
        { id: 'e4', type: 'OPENING_CASH_OVERRIDE', amount: 123 },
      ],
    };
    const result = simulate(cfg, overrides);
    const pack = buildContextPack(result, cfg, overrides, ['acc-1']);

    expect(pack.scenarioChanges).toHaveLength(4);
    expect(pack.scenarioChanges[0]).toMatch(/^1\. Bonus income/);
    expect(pack.scenarioChanges[1]).toMatch(/^2\. Investment deposit .*NPS/);
    // Unknown account id degrades to the word "account", never crashes or skips
    // (skipping would break the 1-based ref alignment).
    expect(pack.scenarioChanges[2]).toMatch(/^3\. Investment deposit .*account/);
    expect(pack.scenarioChanges[3]).toMatch(/^4\. Opening cash override/);
  });
});

describe('buildContextPack — long-horizon downsampling', () => {
  it('keeps the lead months, year-ends, and the lowest-cash month for >120-month forecasts', () => {
    const cfg = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 180 },
      income: { monthly: 100_000 },
      cash: { openingBalance: 50_000 },
      expenses: { defaultMonthly: 60_000, overrides: {} },
      oneOffExpenses: [{ id: 'o1', month: m('2030-06'), label: 'big hit', amount: 5_000_000 }],
    });
    const result = simulate(cfg, {});
    const pack = buildContextPack(result, cfg, {}, []);

    expect(pack.series.labels.length).toBeLessThan(180);
    // full-resolution lead
    expect(pack.series.labels.slice(0, 36)).toEqual(
      result.rows.slice(0, 36).map((r) => r.month),
    );
    // every label after the lead is a December or the lowest-cash month
    for (const label of pack.series.labels.slice(36)) {
      const isDecember = label.endsWith('-12');
      const isLowest = label === result.summary.lowestBalanceMonth;
      expect(isDecember || isLowest).toBe(true);
    }
    // the lowest-cash month is guaranteed present
    expect(pack.series.labels).toContain(result.summary.lowestBalanceMonth);
    // columns stay aligned with labels
    expect(pack.series.cash).toHaveLength(pack.series.labels.length);
    expect(pack.series.netWorth).toHaveLength(pack.series.labels.length);
  });
});

describe('buildContextPack — byte cap', () => {
  it('drops instruments (never the series) when the pack exceeds the cap', () => {
    const instruments: Instrument[] = Array.from({ length: 300 }, (_, i) => ({
      id: `fd-${i}`,
      type: 'FD' as const,
      name: `Fixed Deposit with a deliberately verbose name number ${i} for byte padding`,
      principal: 100_000 + i,
      rate: 7,
      startMonth: m('2025-01'),
      durationMonths: 12,
    }));
    const cfg = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 24 },
      instruments,
    });
    const result = simulate(cfg, {});
    const pack = buildContextPack(result, cfg, {}, []);

    expect(pack.instruments).toEqual([]);
    expect(pack.series.labels.length).toBeGreaterThan(0);
    expect(serializeContextPack(pack).length).toBeLessThanOrEqual(MAX_CONTEXT_PACK_BYTES);
  });
});

describe('hasActiveScenario', () => {
  it('is true for runtime events, scenario accounts, or hidden base accounts — false otherwise', () => {
    expect(hasActiveScenario({})).toBe(false);
    expect(hasActiveScenario({ runtimeEvents: [] })).toBe(false);
    expect(hasActiveScenario({ runtimeEvents: [{ id: 'x', type: 'OPENING_CASH_OVERRIDE', amount: 1 }] })).toBe(true);
    expect(hasActiveScenario({ scenarioAccounts: [account()] })).toBe(true);
    expect(hasActiveScenario({ deletedAccountIds: ['acc-1'] })).toBe(true);
  });
});
