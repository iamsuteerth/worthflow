import { describe, it, expect } from 'vitest';
import { simulate } from '@/engine/simulate';
import { buildContextPack, serializeContextPack, hasActiveScenario } from '@/ai/context/buildContextPack';
import { MAX_CONTEXT_PACK_BYTES } from '@/ai/config';
import { buildEffectiveConfig } from '@/engine/buildEffectiveConfig';
import { fdMaturityValue } from '@/engine/instrumentProjection';
import { addMonths } from '@/engine/dateUtils';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import type { MonthKey } from '@/types/simulation';

// Mirrors the live send() path: plannerStore hands buildContextPack the EFFECTIVE
// config (base + active scenario) and the overrides, with baseline account ids.
function buildPack(config: PlannerConfig, overrides: PlannerOverrides = {}) {
  const effective = buildEffectiveConfig(config, overrides);
  const result = simulate(effective, overrides);
  const baselineIds = config.investments.accounts.map((a) => a.id);
  // Mirror aiStore.getContextBlock: when a scenario is active, also run the pure
  // base plan so the pack can carry a grounded base-vs-scenario effect.
  const baseResult = hasActiveScenario(overrides) ? simulate(config, {}) : undefined;
  return buildContextPack(result, effective, overrides, baselineIds, undefined, baseResult);
}

const cfg = baseConfig({
  forecast: { startMonth: m('2025-01'), totalMonths: 60 },
  income: { monthly: 100_000 },
  cash: { openingBalance: 500_000 },
  expenses: { defaultMonthly: 60_000, overrides: {} },
  investments: {
    accounts: [
      account({
        id: 'acc-1',
        name: 'Mutual Fund',
        startMonth: m('2025-01'),
        openingBalance: 0,
        defaultAnnualReturn: 12,
        defaultMonthlyContribution: 10_000,
      }),
    ],
    amountOverrides: [],
    returnOverrides: [],
  },
  instruments: [
    { id: 'fd-1', type: 'FD', name: 'Tax Saver FD', principal: 100_000, rate: 7, startMonth: m('2025-06'), durationMonths: 24 },
  ],
});

describe('buildContextPack — series labels', () => {
  it('emits a parallel, index-aligned, fully-labelled series', () => {
    const p = buildPack(cfg);
    expect(p.series.labels.length).toBe(p.series.months);
    expect(p.series.cash.length).toBe(p.series.months);
    expect(p.series.netWorth.length).toBe(p.series.months);
    expect(p.series.investments.length).toBe(p.series.months);
    expect(p.series.fd.length).toBe(p.series.months);
    expect(p.series.rd.length).toBe(p.series.months);
    expect(p.series.labels[0]).toBe(p.series.startMonth);
    expect(p.series.labels[0]).toBe('2025-01');
    // ≤120 months → every month is present (no down-sampling)
    expect(p.series.months).toBe(60);
  });

  it('every interior month is answerable and matches the engine row exactly', () => {
    const p = buildPack(cfg);
    const rows = simulate(buildEffectiveConfig(cfg, {}), {}).rows;
    for (const target of ['2025-09', '2027-03', '2029-12']) {
      const idx = p.series.labels.indexOf(target);
      expect(idx).toBeGreaterThan(-1);
      const row = rows.find((r) => r.month === target)!;
      expect(p.series.netWorth[idx]).toBe(Math.round(row.assets.netWorth));
      expect(p.series.cash[idx]).toBe(Math.round(row.assets.cash));
      expect(p.series.investments[idx]).toBe(Math.round(row.assets.investmentCorpus));
    }
  });

  it('headline agrees with the final series entry (no rounding drift)', () => {
    const p = buildPack(cfg);
    const last = p.series.months - 1;
    expect(p.headline.finalNetWorth).toBe(p.series.netWorth[last]);
    expect(p.headline.finalInvestmentCorpus).toBe(p.series.investments[last]);
  });
});

describe('hasActiveScenario / scenario detection (P2 B-5)', () => {
  it('is false for an empty override layer', () => {
    expect(hasActiveScenario({})).toBe(false);
    const p = buildPack(cfg, {});
    expect(p.meta.hasActiveScenario).toBe(false);
    expect(p.meta.generatedFor).toBe('base');
    expect(p.scenarioEffect).toBeUndefined();
  });

  it('is true and carries a scenarioEffect when the only change is a what-if account', () => {
    const overrides: PlannerOverrides = {
      scenarioAccounts: [
        account({ id: 'whatif-1', name: 'New SIP', startMonth: m('2025-01'), openingBalance: 0, defaultAnnualReturn: 10, defaultMonthlyContribution: 5_000 }),
      ],
    };
    expect(hasActiveScenario(overrides)).toBe(true);
    const p = buildPack(cfg, overrides);
    expect(p.meta.hasActiveScenario).toBe(true);
    expect(p.meta.generatedFor).toBe('scenario');
    // The what-if account's effect shows on the scenario side only (base excludes it).
    expect(p.scenarioEffect).toBeDefined();
    expect(p.scenarioEffect!.scenarioFinalNetWorth).not.toBe(p.scenarioEffect!.baseFinalNetWorth);
  });

  it('is true when the only change is a hidden base account', () => {
    expect(hasActiveScenario({ deletedAccountIds: ['acc-1'] })).toBe(true);
  });
});

describe('buildContextPack — instruments come from the engine', () => {
  it('maturity value equals the engine projection, never a re-derivation', () => {
    const p = buildPack(cfg);
    const fd = p.instruments.find((i) => i.name === 'Tax Saver FD')!;
    expect(fd.kind).toBe('FD');
    expect(fd.maturityValue).toBe(Math.round(fdMaturityValue(100_000, 7, 24)));
    expect(fd.maturityMonth).toBe('2027-06'); // 2025-06 + 24 months
  });

  it('surfaces scenario-added instruments via the effective config', () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'rt-fd', type: 'FD', name: 'Scenario FD', principal: 50_000, rate: 6, startMonth: m('2026-01'), durationMonths: 12 },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.meta.hasActiveScenario).toBe(true);
    expect(p.instruments.some((i) => i.name === 'Scenario FD')).toBe(true);
    expect(p.scenarioChanges.some((s) => s.includes('Scenario FD'))).toBe(true);
  });
});

describe('buildContextPack — scenario effect (base vs scenario, grounded)', () => {
  it('omits scenarioEffect when no scenario is active', () => {
    const p = buildPack(cfg);
    expect(p.meta.hasActiveScenario).toBe(false);
    expect(p.scenarioEffect).toBeUndefined();
  });

  it('reports base and scenario figures straight from the engine (no re-derivation)', () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'rt-1', type: 'ONE_OFF_EXPENSE', month: m('2025-06'), amount: 200_000, label: 'Big spend' },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.scenarioEffect).toBeDefined();
    const eff = p.scenarioEffect!;
    const base = simulate(cfg, {}); // the pure base plan
    expect(eff.baseFinalNetWorth).toBe(Math.round(base.summary.finalNetWorth));
    expect(eff.baseLowestCash).toBe(Math.round(base.summary.lowestBalance));
    expect(eff.baseLowestCashMonth).toBe(base.summary.lowestBalanceMonth);
    // Scenario side agrees with the pack headline exactly.
    expect(eff.scenarioFinalNetWorth).toBe(p.headline.finalNetWorth);
    expect(eff.scenarioLowestCash).toBe(p.headline.lowestCash);
    // A ₹2 lakh one-off expense lowers final net worth vs the base.
    expect(eff.scenarioFinalNetWorth).toBeLessThan(eff.baseFinalNetWorth);
  });

  it('renders an opening-cash override with its real amount, not ₹0', () => {
    // Regression: buildScenarioChanges previously read overrides.openingBalance (never
    // set by the addTransient flow) instead of the event's own amount, so the model
    // was told every opening-cash override was ₹0.
    const overrides: PlannerOverrides = {
      runtimeEvents: [{ id: 'oc-1', type: 'OPENING_CASH_OVERRIDE', amount: 750_000 }],
    };
    const p = buildPack(cfg, overrides);
    const line = p.scenarioChanges.find((s) => s.toLowerCase().includes('opening cash'));
    expect(line).toBeDefined();
    expect(line).toContain('7,50,000'); // en-IN formatted, real amount
    expect(line).not.toContain('₹0');
  });

  it('numbers scenarioChanges 1-based, in runtimeEvents order', () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'rt-a', type: 'ONE_OFF_EXPENSE', month: m('2025-06'), amount: 1_000, label: 'A' },
        { id: 'rt-b', type: 'BONUS_INCOME', month: m('2025-07'), amount: 5_000, description: 'B' },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.scenarioChanges).toHaveLength(2);
    expect(p.scenarioChanges[0].startsWith('1. ')).toBe(true);
    expect(p.scenarioChanges[1].startsWith('2. ')).toBe(true);
    expect(p.scenarioChanges[0]).toContain('One-off expense');
    expect(p.scenarioChanges[1]).toContain('Bonus income');
  });
});

describe('buildContextPack — redaction (never leak ids / secrets)', () => {
  it('serialized pack contains names but no internal ids, accountIds, emails, or UUIDs', () => {
    const json = serializeContextPack(buildPack(cfg));
    expect(json).toContain('Mutual Fund'); // names ARE sent (the point)
    expect(json).toContain('Tax Saver FD');
    expect(json).not.toContain('acc-1');
    expect(json).not.toContain('fd-1');
    expect(json).not.toContain('accountId');
    expect(json).not.toMatch(/@/); // no email addresses
    expect(json).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    ); // no UUIDs
  });
});

describe('buildContextPack — scaling to long horizons', () => {
  it('down-samples a 180-month plan to leading months + year-ends, staying under the byte cap', () => {
    const longCfg = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 180 },
      income: { monthly: 100_000 },
      cash: { openingBalance: 200_000 },
      expenses: { defaultMonthly: 80_000, overrides: {} },
    });
    const p = buildPack(longCfg);

    expect(p.series.months).toBeLessThan(180); // down-sampled
    // First 36 months stay contiguous.
    const expectedLead = Array.from({ length: 36 }, (_, i) => addMonths('2025-01' as MonthKey, i));
    expect(p.series.labels.slice(0, 36)).toEqual(expectedLead);
    // Everything after the lead is a year-end (or the lowest-cash month).
    for (const label of p.series.labels.slice(36)) {
      expect(label.endsWith('-12') || label === p.headline.lowestCashMonth).toBe(true);
    }
    expect(serializeContextPack(p).length).toBeLessThanOrEqual(MAX_CONTEXT_PACK_BYTES);
  });

  it('keeps a dense 60-month, account+instrument pack under the byte cap', () => {
    expect(serializeContextPack(buildPack(cfg)).length).toBeLessThanOrEqual(MAX_CONTEXT_PACK_BYTES);
  });
});
