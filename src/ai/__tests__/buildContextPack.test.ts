import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import type { MonthKey } from '@/types/simulation';

import { describe, it, expect } from 'vitest';

import { MAX_CONTEXT_PACK_BYTES } from '@/ai/config';
import { buildContextPack, serializeContextPack, hasActiveScenario } from '@/ai/context/buildContextPack';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { buildEffectiveConfig } from '@/engine/buildEffectiveConfig';
import { addMonths } from '@/engine/dateUtils';
import { fdMaturityValue } from '@/engine/instrumentProjection';
import { simulate } from '@/engine/simulate';

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
    // Per-month cashflow-component columns are equally parallel.
    expect(p.series.income.length).toBe(p.series.months);
    expect(p.series.flatExp.length).toBe(p.series.months);
    expect(p.series.oneOff.length).toBe(p.series.months);
    expect(p.series.recurring.length).toBe(p.series.months);
    expect(p.series.creditCard.length).toBe(p.series.months);
    expect(p.series.investing.length).toBe(p.series.months);
    expect(p.series.proceeds.length).toBe(p.series.months);
    expect(p.series.instrumentFlow.length).toBe(p.series.months);
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

describe('buildContextPack — per-month cashflow components', () => {
  it('reads each component verbatim from the engine cashflow at the same index', () => {
    // 300k one-off in 2026-03 on top of the 60k baseline spend.
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'oneoff', type: 'ONE_OFF_EXPENSE', month: m('2026-03'), amount: 300_000, label: 'Wedding' },
      ],
    };
    const p = buildPack(cfg, overrides);
    const rows = simulate(buildEffectiveConfig(cfg, overrides), overrides).rows;
    for (const target of ['2025-09', '2026-03', '2028-06']) {
      const idx = p.series.labels.indexOf(target);
      expect(idx).toBeGreaterThan(-1);
      const cf = rows.find((r) => r.month === target)!.cashflow;
      expect(p.series.income[idx]).toBe(Math.round(cf.income));
      expect(p.series.flatExp[idx]).toBe(Math.round(cf.flatExpense));
      expect(p.series.oneOff[idx]).toBe(Math.round(cf.oneOffExpense));
      expect(p.series.recurring[idx]).toBe(Math.round(cf.recurringExpense));
      expect(p.series.creditCard[idx]).toBe(Math.round(cf.creditCardExpense));
      expect(p.series.investing[idx]).toBe(Math.round(cf.investmentAmount));
    }
    // The one-off shows up as a decomposable component in its month.
    const wIdx = p.series.labels.indexOf('2026-03');
    expect(p.series.oneOff[wIdx]).toBe(300_000);
  });
});

describe('buildContextPack — deposits, withdrawals & instruments are decomposable (Finding 2)', () => {
  const withFlows: PlannerOverrides = {
    runtimeEvents: [
      { id: 'dep', type: 'INVESTMENT_DEPOSIT', accountId: 'acc-1', month: m('2025-04'), amount: 20_000 },
      { id: 'wd', type: 'INVESTMENT_WITHDRAWAL', accountId: 'acc-1', month: m('2026-04'), amount: 15_000 },
      { id: 'rtfd', type: 'FD', name: 'Runtime FD', principal: 80_000, rate: 7, startMonth: m('2025-08'), durationMonths: 12 },
    ],
  };

  it('exposes signed proceeds and instrumentFlow verbatim from the engine', () => {
    const p = buildPack(cfg, withFlows);
    const rows = simulate(buildEffectiveConfig(cfg, withFlows), withFlows).rows;
    for (const target of ['2025-04', '2026-04', '2025-08']) {
      const idx = p.series.labels.indexOf(target);
      const cf = rows.find((r) => r.month === target)!.cashflow;
      expect(p.series.proceeds[idx]).toBe(Math.round(cf.proceeds));
      expect(p.series.instrumentFlow[idx]).toBe(Math.round(cf.instrumentFlow));
    }
    // A deposit is cash OUT (negative proceeds); a withdrawal is cash IN (positive).
    expect(p.series.proceeds[p.series.labels.indexOf('2025-04')]).toBeLessThan(0);
    expect(p.series.proceeds[p.series.labels.indexOf('2026-04')]).toBeGreaterThan(0);
    // Buying the FD is cash OUT (negative instrumentFlow) in its start month.
    expect(p.series.instrumentFlow[p.series.labels.indexOf('2025-08')]).toBeLessThan(0);
  });

  it('every month reconciles: the flow columns account for the full cash movement', () => {
    // This is the whole point of Finding 2 — before it, a deposit or FD month left an
    // unexplained gap between the spend columns and the cash drop.
    const p = buildPack(cfg, withFlows);
    const s = p.series;
    for (let i = 1; i < s.months; i++) {
      const recon =
        s.income[i] - s.flatExp[i] - s.oneOff[i] - s.recurring[i] -
        s.creditCard[i] - s.investing[i] + s.proceeds[i] + s.instrumentFlow[i];
      // Integer columns → allow a couple of rupees of rounding drift.
      expect(Math.abs((s.cash[i] - s.cash[i - 1]) - recon)).toBeLessThanOrEqual(2);
    }
  });
});

describe('buildContextPack — planItems catalog (named drivers)', () => {
  it('names a BASE-plan one-off expense that the pack never surfaced before', () => {
    const withBaseOneOff = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 60 },
      income: { monthly: 100_000 },
      cash: { openingBalance: 500_000 },
      expenses: { defaultMonthly: 60_000, overrides: {} },
      oneOffExpenses: [{ id: 'o1', month: m('2027-09'), label: 'Car down payment', amount: 250_000 }],
    });
    const p = buildPack(withBaseOneOff);
    const item = p.planItems.find((i) => i.name === 'Car down payment');
    expect(item).toBeDefined();
    expect(item!.kind).toBe('oneOff');
    expect(item!.month).toBe('2027-09');
    expect(item!.amount).toBe(250_000);
    // The name is in the serialized block the model actually receives.
    expect(serializeContextPack(p)).toContain('Car down payment');
  });

  it('includes active-scenario line items alongside base ones (from the effective config)', () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'rec', type: 'RECURRING_EXPENSE', name: 'Gym', amount: 2_000, startMonth: m('2025-03'), endMonth: m('2026-02'), frequency: 'MONTHLY' },
      ],
    };
    const p = buildPack(cfg, overrides);
    const gym = p.planItems.find((i) => i.name === 'Gym');
    expect(gym).toBeDefined();
    expect(gym!.kind).toBe('recurring');
    expect(gym!.from).toBe('2025-03');
    expect(gym!.to).toBe('2026-02');
    expect(gym!.freq).toBe('MONTHLY');
  });
});

describe('buildContextPack — aggregates (pre-computed, engine-grounded)', () => {
  it('pins the highest-expense month to a large one-off, verbatim from the engine', () => {
    // Baseline spend is 60k/mo; a 300k one-off in 2026-03 must be the peak.
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'oneoff', type: 'ONE_OFF_EXPENSE', month: m('2026-03'), amount: 300_000, label: 'Wedding' },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.aggregates.highestExpenseMonth.month).toBe('2026-03');
    // 60k flat + 300k one-off = 360k that month.
    expect(p.aggregates.highestExpenseMonth.amount).toBe(360_000);
  });

  it('surfaces the biggest cash drops (the visible dips), largest first', () => {
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'oneoff', type: 'ONE_OFF_EXPENSE', month: m('2026-03'), amount: 300_000, label: 'Wedding' },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.aggregates.biggestCashDrops.length).toBeGreaterThan(0);
    // The 300k one-off month is the deepest month-over-month cash fall.
    expect(p.aggregates.biggestCashDrops[0].month).toBe('2026-03');
    // Sorted descending by magnitude.
    const drops = p.aggregates.biggestCashDrops.map((d) => d.drop);
    expect([...drops].sort((a, b) => b - a)).toEqual(drops);
  });

  it('rolls up per-year totals aligned to the engine rows', () => {
    const p = buildPack(cfg);
    const rows = simulate(buildEffectiveConfig(cfg, {}), {}).rows;
    // 60-month plan starting 2025-01 → years 2025..2029.
    expect(p.aggregates.perYear.map((y) => y.year)).toEqual(['2025', '2026', '2027', '2028', '2029']);
    // Each year's end-cash equals that year's December engine row.
    for (const y of p.aggregates.perYear) {
      const dec = rows.find((r) => r.month === `${y.year}-12`)!;
      expect(y.endCash).toBe(Math.round(dec.assets.cash));
      expect(y.endNetWorth).toBe(Math.round(dec.assets.netWorth));
    }
  });

  it('highestOutflowMonth counts an FD purchase, not just spending (Finding 1)', () => {
    // A one-off ₹5L FD dwarfs the 60k/mo spend and 10k/mo investing — it must be the
    // biggest cash-OUT month even though an FD purchase is not an "expense". Before the
    // fix this read totalOutflow (spend + investing only) and missed the FD entirely.
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'bigfd', type: 'FD', name: 'Big FD', principal: 500_000, rate: 7, startMonth: m('2025-05'), durationMonths: 24 },
      ],
    };
    const p = buildPack(cfg, overrides);
    expect(p.aggregates.highestOutflowMonth.month).toBe('2025-05');
    // 60k spend + 10k investing + 500k FD purchase = 570k out that month.
    expect(p.aggregates.highestOutflowMonth.amount).toBe(570_000);
    // The pure-spending peak is unaffected — the FD is not an expense.
    expect(p.aggregates.highestExpenseMonth.amount).toBe(60_000);
  });

  it('keeps the pack under the byte cap with aggregates included', () => {
    expect(serializeContextPack(buildPack(cfg)).length).toBeLessThanOrEqual(MAX_CONTEXT_PACK_BYTES);
  });
});

describe('buildContextPack — account investedCapital is the full cost basis (Finding 3)', () => {
  it('includes the opening balance and runtime deposits, not just monthly contributions', () => {
    const seeded = baseConfig({
      forecast: { startMonth: m('2025-01'), totalMonths: 12 },
      income: { monthly: 100_000 },
      cash: { openingBalance: 500_000 },
      expenses: { defaultMonthly: 0, overrides: {} },
      investments: {
        accounts: [
          account({ id: 'acc-1', name: 'Fund', startMonth: m('2025-01'), openingBalance: 100_000, defaultAnnualReturn: 0, defaultMonthlyContribution: 5_000 }),
        ],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const overrides: PlannerOverrides = {
      runtimeEvents: [
        { id: 'dep', type: 'INVESTMENT_DEPOSIT', accountId: 'acc-1', month: m('2025-02'), amount: 50_000 },
      ],
    };
    const p = buildPack(seeded, overrides);
    const acc = p.accounts.find((a) => a.name === 'Fund')!;
    // opening 100k + 12 monthly contributions × 5k (60k) + one 50k deposit = 210k.
    expect(acc.investedCapital).toBe(210_000);
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
