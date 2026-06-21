import { describe, it, expect } from 'vitest';
import { simulate } from '@/engine/simulate';
import { buildContextPack, serializeContextPack } from '@/ai/context/buildContextPack';
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
  return buildContextPack(result, effective, overrides, baselineIds);
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
