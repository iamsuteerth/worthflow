import type { SimulationResult } from '@/engine/simulate';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import { MAX_CONTEXT_PACK_BYTES } from '@/ai/config';
import { projectInstrument } from '@/engine/instrumentProjection';
import { addMonths } from '@/engine/dateUtils';
import type { MonthlyCashflow } from '@/types/simulation';
import type { ContextPack, ContextPackSeries, ContextPackAggregates } from '@/ai/context/contextPack.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function xirrToPercent(xirr: number | null): number | null {
  return xirr !== null ? Math.round(xirr * 1000) / 10 : null;
}

// ---------------------------------------------------------------------------
// Full columnar series
// For forecasts > FULL_MONTH_LIMIT, keep the first LEAD_MONTHS in full
// resolution and sample the remainder at yearly intervals (December of each
// year) plus always include the lowest-cash month.
// ---------------------------------------------------------------------------

const FULL_MONTH_LIMIT = 120;
const LEAD_MONTHS = 36;

export function buildFullSeries(
  result: SimulationResult,
  focusFrom?: string,
  focusTo?: string,
): ContextPackSeries {
  let rows = result.rows;

  if (focusFrom || focusTo) {
    rows = rows.filter((r) => {
      if (focusFrom && r.month < focusFrom) return false;
      if (focusTo && r.month > focusTo) return false;
      return true;
    });
  }

  if (rows.length === 0) {
    return { startMonth: '', months: 0, labels: [], cash: [], netWorth: [], investments: [], fd: [], rd: [] };
  }

  let seriesRows = rows;

  if (rows.length > FULL_MONTH_LIMIT) {
    const lead = rows.slice(0, LEAD_MONTHS);
    const tail = rows.slice(LEAD_MONTHS);

    // December of each year in the tail (month string ends in "-12")
    const yearlyTail = tail.filter((r) => r.month.endsWith('-12'));

    // Always include the lowest-cash month even if it's not a December
    const lowestMonth = result.summary.lowestBalanceMonth;
    const lowestRow = tail.find((r) => r.month === lowestMonth);

    const tailMap = new Map<string, typeof rows[0]>();
    for (const r of yearlyTail) tailMap.set(r.month, r);
    if (lowestRow && !tailMap.has(lowestRow.month)) tailMap.set(lowestRow.month, lowestRow);

    const sortedTail = [...tailMap.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
    seriesRows = [...lead, ...sortedTail];
  }

  return {
    startMonth: seriesRows[0].month,
    months: seriesRows.length,
    labels: seriesRows.map((r) => r.month),
    cash: seriesRows.map((r) => Math.round(r.assets.cash)),
    netWorth: seriesRows.map((r) => Math.round(r.assets.netWorth)),
    investments: seriesRows.map((r) => Math.round(r.assets.investmentCorpus)),
    fd: seriesRows.map((r) => Math.round(r.assets.fdValue)),
    rd: seriesRows.map((r) => Math.round(r.assets.rdValue)),
  };
}

// ---------------------------------------------------------------------------
// Aggregates — pre-computed answers to the common aggregate questions ("most
// expensive month", "why the big dips", "how does each year look"), so a
// single-shot answer quotes the engine instead of doing (and fluffing) its own
// arithmetic. Computed over ALL rows at full resolution.
// ---------------------------------------------------------------------------

// A month's actual spending: flat + credit-card + one-off + recurring. Excludes
// investment contributions and FD/RD funding (those are cash out, but not
// "expenses" the way a user means the word — see highestOutflowMonth).
function monthExpense(cf: MonthlyCashflow): number {
  return cf.flatExpense + cf.creditCardExpense + cf.oneOffExpense + cf.recurringExpense;
}

function buildAggregates(result: SimulationResult): ContextPackAggregates {
  const rows = result.rows;
  if (rows.length === 0) {
    return {
      avgMonthlyExpense: 0,
      highestExpenseMonth: { month: '', amount: 0 },
      highestOutflowMonth: { month: '', amount: 0 },
      biggestCashDrops: [],
      perYear: [],
    };
  }

  let hiExp = { month: rows[0].month, amount: -Infinity };
  let hiOut = { month: rows[0].month, amount: -Infinity };
  let expenseSum = 0;

  const byYear = new Map<string, { income: number; expenses: number; endCash: number; endNetWorth: number }>();

  for (const r of rows) {
    const exp = monthExpense(r.cashflow);
    expenseSum += exp;
    if (exp > hiExp.amount) hiExp = { month: r.month, amount: exp };
    if (r.cashflow.totalOutflow > hiOut.amount) hiOut = { month: r.month, amount: r.cashflow.totalOutflow };

    // rows are chronological, so the last write per year is that year's December.
    const year = r.month.slice(0, 4);
    const y = byYear.get(year) ?? { income: 0, expenses: 0, endCash: 0, endNetWorth: 0 };
    y.income += r.cashflow.income;
    y.expenses += exp;
    y.endCash = r.assets.cash;
    y.endNetWorth = r.assets.netWorth;
    byYear.set(year, y);
  }

  // Month-over-month cash decreases (the visible "dips"), largest first, top 3.
  const drops: Array<{ month: string; drop: number }> = [];
  for (let i = 1; i < rows.length; i++) {
    const delta = rows[i].assets.cash - rows[i - 1].assets.cash;
    if (delta < 0) drops.push({ month: rows[i].month, drop: Math.round(-delta) });
  }
  drops.sort((a, b) => b.drop - a.drop);

  return {
    avgMonthlyExpense: Math.round(expenseSum / rows.length),
    highestExpenseMonth: { month: hiExp.month, amount: Math.round(hiExp.amount) },
    highestOutflowMonth: { month: hiOut.month, amount: Math.round(hiOut.amount) },
    biggestCashDrops: drops.slice(0, 3),
    perYear: [...byYear.entries()].map(([year, v]) => ({
      year,
      income: Math.round(v.income),
      expenses: Math.round(v.expenses),
      endCash: Math.round(v.endCash),
      endNetWorth: Math.round(v.endNetWorth),
    })),
  };
}

// ---------------------------------------------------------------------------
// Scenario changes
// ---------------------------------------------------------------------------

function buildScenarioChanges(
  config: PlannerConfig,
  overrides: PlannerOverrides,
): string[] {
  const accountName = (id: string): string =>
    config.investments.accounts.find((a) => a.id === id)?.name ?? 'account';

  // The switch narrows RuntimeEvent by its `type` discriminant — no casts needed.
  const lines = (overrides.runtimeEvents ?? []).map((e): string => {
    switch (e.type) {
      case 'ONE_OFF_EXPENSE':
        return `One-off expense ${formatMoney(e.amount)} in ${e.month}${e.label ? ` (${e.label})` : ''}`;
      case 'CREDIT_CARD_EXPENSE':
        return `Credit card expense ${formatMoney(e.amount)} in ${e.month}`;
      case 'RECURRING_EXPENSE':
        return `Recurring expense "${e.name}" ${formatMoney(e.amount)}/${e.frequency === 'MONTHLY' ? 'mo' : 'yr'} from ${e.startMonth} to ${e.endMonth}`;
      case 'BONUS_INCOME':
        return `Bonus income ${formatMoney(e.amount)} in ${e.month}`;
      case 'SALARY_CHANGE':
        return `Salary changes to ${formatMoney(e.newMonthlyIncome)}/mo from ${e.effectiveMonth}`;
      case 'SPENDING_OVERRIDE':
        return `Monthly spend set to ${formatMoney(e.amount)}/mo from ${e.startMonth} to ${e.endMonth}`;
      case 'OPENING_CASH_OVERRIDE':
        // The amount lives on the event (applied to config.cash.openingBalance by
        // buildEffectiveConfig), NOT on overrides.openingBalance — reading the latter
        // always reported ₹0 to the model.
        return `Opening cash override: ${formatMoney(e.amount)}`;
      case 'INVESTMENT_DEPOSIT':
        return `Investment deposit ${formatMoney(e.amount)} to ${accountName(e.accountId)} in ${e.month}`;
      case 'INVESTMENT_WITHDRAWAL':
        return `Investment withdrawal ${formatMoney(e.amount)} from ${accountName(e.accountId)} in ${e.month}`;
      case 'ACCOUNT_AMOUNT_OVERRIDE':
        return `Contribution override for ${accountName(e.accountId)}: ${formatMoney(e.amount)}/mo from ${e.startMonth} to ${e.endMonth}`;
      case 'ACCOUNT_RETURN_OVERRIDE':
        return `Return override for ${accountName(e.accountId)}: ${e.annualReturn}% p.a. from ${e.startMonth} to ${e.endMonth}`;
      case 'FD':
        return `New FD "${e.name}": ${formatMoney(e.principal)} at ${e.rate}% for ${e.durationMonths} months from ${e.startMonth}`;
      case 'RD':
        return `New RD "${e.name}": ${formatMoney(e.monthlyContribution)}/mo at ${e.rate}% for ${e.durationMonths} months from ${e.startMonth}`;
    }
  });

  // Number each entry (1-based) in runtimeEvents order. The model uses this number
  // as the `ref` when editing/deleting a change, and it keeps "what's active" lists
  // unambiguous. MUST stay index-aligned with overrides.runtimeEvents (and with the
  // scenarioEventIds the store passes to validateAction).
  return lines.map((line, i) => `${i + 1}. ${line}`);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// A scenario is "active" if ANY override-layer change is present — not just runtime
// events, but also a scenario-created what-if account or a hidden base account. Used to
// set meta.hasActiveScenario / generatedFor and to gate scenarioEffect. Mirrors how the
// UI (ScenarioBanner, ConfigBuilderPage) defines an active scenario, so the assistant
// never says "no active scenario" when the plan genuinely differs from base. See P2 B-5.
export function hasActiveScenario(overrides: PlannerOverrides): boolean {
  return (
    (overrides.runtimeEvents?.length ?? 0) > 0 ||
    (overrides.scenarioAccounts?.length ?? 0) > 0 ||
    (overrides.deletedAccountIds?.length ?? 0) > 0
  );
}

export function buildContextPack(
  result: SimulationResult,
  config: PlannerConfig,
  overrides: PlannerOverrides,
  baselineAccountIds: string[],
  focusWindow?: { from: string; to: string },
  baseResult?: SimulationResult,
): ContextPack {
  const { summary } = result;
  const scenarioActive = hasActiveScenario(overrides);

  const finalRow = result.rows[result.rows.length - 1];
  const accounts = config.investments.accounts.map((acct) => {
    const snap = finalRow.assets.accountSnapshots.find((s) => s.accountId === acct.id);
    return {
      name: acct.name,
      currentValue: Math.round(snap?.value ?? 0),
      xirrPct: xirrToPercent(summary.accountXirr[acct.id] ?? null),
      totalContributions: Math.round(summary.accountContributions[acct.id] ?? 0),
      addedInScenario: !baselineAccountIds.includes(acct.id),
    };
  });

  // Maturity figures come straight from the engine's projection so they can never
  // disagree with the fd[]/rd[] series or the simulated payout.
  const instruments = config.instruments.map((inst) => {
    const { maturityValue } = projectInstrument(inst);
    const maturityMonth = addMonths(inst.startMonth, inst.durationMonths);
    return {
      kind: inst.type,
      name: inst.name,
      principalOrContribution: inst.type === 'FD' ? inst.principal : inst.monthlyContribution,
      ratePct: inst.rate,
      startMonth: inst.startMonth,
      maturityMonth,
      maturityValue: Math.round(maturityValue),
    };
  });

  const pack: ContextPack = {
    meta: {
      currency: 'INR',
      horizonMonths: config.forecast.totalMonths,
      startMonth: config.forecast.startMonth,
      hasActiveScenario: scenarioActive,
      generatedFor: scenarioActive ? 'scenario' : 'base',
    },
    headline: {
      finalNetWorth: Math.round(summary.finalNetWorth),
      finalCash: Math.round(summary.finalBalance),
      finalInvestmentCorpus: Math.round(summary.finalInvestmentCorpus),
      lowestCash: Math.round(summary.lowestBalance),
      lowestCashMonth: summary.lowestBalanceMonth,
      portfolioXirrPct: xirrToPercent(summary.xirr),
      totalIncome: Math.round(summary.totalIncome),
      totalExpenses: Math.round(summary.totalExpenses),
    },
    aggregates: buildAggregates(result),
    series: buildFullSeries(result, focusWindow?.from, focusWindow?.to),
    accounts,
    instruments,
    scenarioChanges: buildScenarioChanges(config, overrides),
    // Base-vs-scenario effect, grounded in a real base-plan simulation. Only when a
    // scenario is active AND the caller supplied the base run (see aiStore).
    scenarioEffect:
      scenarioActive && baseResult
        ? {
            baseFinalNetWorth: Math.round(baseResult.summary.finalNetWorth),
            scenarioFinalNetWorth: Math.round(summary.finalNetWorth),
            baseLowestCash: Math.round(baseResult.summary.lowestBalance),
            scenarioLowestCash: Math.round(summary.lowestBalance),
            baseLowestCashMonth: baseResult.summary.lowestBalanceMonth,
            scenarioLowestCashMonth: summary.lowestBalanceMonth,
          }
        : undefined,
    focusWindow,
  };

  // Size guard: if the pack exceeds the byte cap, drop instruments (series is never dropped —
  // the model needs it to answer month-specific questions correctly).
  const json = JSON.stringify(pack);
  if (json.length > MAX_CONTEXT_PACK_BYTES) {
    return { ...pack, instruments: [] };
  }

  return pack;
}

export function serializeContextPack(pack: ContextPack): string {
  return JSON.stringify(pack, null, 0);
}
