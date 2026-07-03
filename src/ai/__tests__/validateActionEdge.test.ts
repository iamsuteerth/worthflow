import { describe, it, expect } from 'vitest';
import { validateAction, resolveAccountName, type ActionValidationContext } from '@/ai/actions/validateAction';
import { m } from '@/engine/__tests__/factories';

const ctx: ActionValidationContext = {
  startMonth: m('2025-01'),
  totalMonths: 12, // window: 2025-01 … 2025-12
  accountNames: ['NPS', 'Stocks'],
  scenarioEventIds: ['ev-1', 'ev-2'],
};

describe('validateAction — window edges', () => {
  it('accepts the first and last month of the window, rejects one past either end', () => {
    const mk = (month: string) => ({ kind: 'ADD_ONE_OFF_EXPENSE', month, amount: 1000, label: 'x' });
    expect(validateAction(mk('2025-01'), ctx).ok).toBe(true);
    expect(validateAction(mk('2025-12'), ctx).ok).toBe(true);
    expect(validateAction(mk('2024-12'), ctx).ok).toBe(false);
    expect(validateAction(mk('2026-01'), ctx).ok).toBe(false);
  });

  it('rejects a malformed month string', () => {
    expect(validateAction({ kind: 'ADD_ONE_OFF_EXPENSE', month: '2025-13', amount: 1, label: 'x' }, ctx).ok).toBe(false);
    expect(validateAction({ kind: 'ADD_ONE_OFF_EXPENSE', month: 'January', amount: 1, label: 'x' }, ctx).ok).toBe(false);
  });

  it('rejects a range whose start is after its end', () => {
    const r = validateAction(
      { kind: 'ADD_SPENDING_OVERRIDE', startMonth: '2025-06', endMonth: '2025-03', amount: 10_000 },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/start month/i);
  });

  it('rejects an ANNUAL recurring expense that does not span whole years', () => {
    const r = validateAction(
      {
        kind: 'ADD_RECURRING_EXPENSE',
        name: 'insurance',
        amount: 20_000,
        startMonth: '2025-01',
        endMonth: '2025-06',
        frequency: 'ANNUAL',
      },
      ctx,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validateAction — scenario refs', () => {
  it('rejects ref 0, negative, fractional, and out-of-range refs', () => {
    for (const ref of [0, -1, 1.5, 3, 99]) {
      const r = validateAction({ kind: 'DELETE_SCENARIO_EVENT', ref }, ctx);
      expect(r.ok).toBe(false);
    }
  });

  it('resolves an in-range ref to the concrete event id', () => {
    const r = validateAction({ kind: 'DELETE_SCENARIO_EVENT', ref: 2 }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok && r.action.kind === 'DELETE_SCENARIO_EVENT') {
      expect(r.action.targetEventId).toBe('ev-2');
    }
  });

  it('rejects an EDIT whose new month is outside the window even when the ref is valid', () => {
    const r = validateAction({ kind: 'EDIT_SCENARIO_EVENT', ref: 1, month: '2026-03' }, ctx);
    expect(r.ok).toBe(false);
  });
});

describe('validateAction — schema bounds', () => {
  it('rejects out-of-bounds FD parameters', () => {
    const fd = (over: object) => ({
      kind: 'ADD_FD',
      month: '2025-03',
      principal: 100_000,
      rate: 7,
      durationMonths: 12,
      name: 'FD',
      ...over,
    });
    expect(validateAction(fd({}), ctx).ok).toBe(true);
    expect(validateAction(fd({ rate: 16 }), ctx).ok).toBe(false);
    expect(validateAction(fd({ rate: -1 }), ctx).ok).toBe(false);
    expect(validateAction(fd({ durationMonths: 0 }), ctx).ok).toBe(false);
    expect(validateAction(fd({ durationMonths: 121 }), ctx).ok).toBe(false);
    expect(validateAction(fd({ principal: -5 }), ctx).ok).toBe(false);
    expect(validateAction(fd({ principal: 0 }), ctx).ok).toBe(false);
  });

  it('allows a negative opening-cash override (explicitly supported)', () => {
    expect(validateAction({ kind: 'SET_OPENING_CASH_OVERRIDE', amount: -50_000 }, ctx).ok).toBe(true);
  });

  it('rejects junk payloads with the generic message', () => {
    for (const junk of [null, undefined, 'text', 42, [], {}, { kind: 'MAKE_ME_RICH' }]) {
      const r = validateAction(junk, ctx);
      expect(r.ok).toBe(false);
    }
  });
});

describe('resolveAccountName — ambiguity rules', () => {
  it('prefers a unique exact match over case-insensitive candidates', () => {
    const r = resolveAccountName('NPS', ['NPS', 'nps']);
    expect(r).toEqual({ ok: true, name: 'NPS' });
  });

  it('fails closed when only case-insensitive matches exist and they are ambiguous', () => {
    const r = resolveAccountName('Nps', ['NPS', 'nps']);
    expect(r.ok).toBe(false);
  });

  it('fails closed on duplicate exact names', () => {
    const r = resolveAccountName('NPS', ['NPS', 'NPS']);
    expect(r.ok).toBe(false);
  });

  it('resolves a unique case-insensitive match and trims whitespace', () => {
    expect(resolveAccountName('  stocks ', ['NPS', 'Stocks'])).toEqual({ ok: true, name: 'Stocks' });
  });

  it('reports an unknown account by the requested name', () => {
    const r = resolveAccountName('Ghost', ['NPS']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Ghost');
  });

  it('validateAction routes deposits through account resolution', () => {
    const ok = validateAction(
      { kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'nps', month: '2025-02', amount: 5_000 },
      ctx,
    );
    expect(ok.ok).toBe(true);
    const bad = validateAction(
      { kind: 'ADD_INVESTMENT_DEPOSIT', accountName: 'Ghost', month: '2025-02', amount: 5_000 },
      ctx,
    );
    expect(bad.ok).toBe(false);
  });
});
