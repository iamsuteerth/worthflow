import type { SimulationResult } from '@/engine/simulate';
import type { PlannerConfig } from '@/types/config';
import type { PlannerOverrides } from '@/types/overrides';
import type {
  RuntimeOneOffExpense,
  RuntimeCreditCardExpense,
  RuntimeRecurringExpense,
  RuntimeBonusIncome,
  RuntimeSalaryChange,
  RuntimeSpendingOverride,
  RuntimeOpeningCashOverride,
  RuntimeInvestmentDeposit,
  RuntimeInvestmentWithdrawal,
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
  RuntimeFixedDeposit,
  RuntimeRecurringDeposit,
} from '@/types/runtimeEvent';
import { MAX_CONTEXT_PACK_BYTES } from '@/ai/config';
import { projectInstrument } from '@/engine/instrumentProjection';
import { addMonths } from '@/engine/dateUtils';
import type { ContextPack, ContextPackSeries } from '@/ai/context/contextPack.types';

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

function buildFullSeries(
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
// Scenario changes
// ---------------------------------------------------------------------------

function buildScenarioChanges(
  config: PlannerConfig,
  overrides: PlannerOverrides,
): string[] {
  const lines: string[] = [];
  const events = overrides.runtimeEvents ?? [];

  for (const e of events) {
    switch (e.type) {
      case 'ONE_OFF_EXPENSE':
        lines.push(`One-off expense ${formatMoney((e as RuntimeOneOffExpense).amount)} in ${(e as RuntimeOneOffExpense).month}${(e as RuntimeOneOffExpense).label ? ` (${(e as RuntimeOneOffExpense).label})` : ''}`);
        break;
      case 'CREDIT_CARD_EXPENSE':
        lines.push(`Credit card expense ${formatMoney((e as RuntimeCreditCardExpense).amount)} in ${(e as RuntimeCreditCardExpense).month}`);
        break;
      case 'RECURRING_EXPENSE': {
        const re = e as RuntimeRecurringExpense;
        lines.push(`Recurring expense "${re.name}" ${formatMoney(re.amount)}/${re.frequency === 'MONTHLY' ? 'mo' : 'yr'} from ${re.startMonth} to ${re.endMonth}`);
        break;
      }
      case 'BONUS_INCOME':
        lines.push(`Bonus income ${formatMoney((e as RuntimeBonusIncome).amount)} in ${(e as RuntimeBonusIncome).month}`);
        break;
      case 'SALARY_CHANGE': {
        const sc = e as RuntimeSalaryChange;
        lines.push(`Salary changes to ${formatMoney(sc.newMonthlyIncome)}/mo from ${sc.effectiveMonth}`);
        break;
      }
      case 'SPENDING_OVERRIDE': {
        const so = e as RuntimeSpendingOverride;
        lines.push(`Monthly spend set to ${formatMoney(so.amount)}/mo from ${so.startMonth} to ${so.endMonth}`);
        break;
      }
      case 'OPENING_CASH_OVERRIDE':
        // The amount lives on the event (applied to config.cash.openingBalance by
        // buildEffectiveConfig), NOT on overrides.openingBalance — reading the latter
        // always reported ₹0 to the model.
        lines.push(`Opening cash override: ${formatMoney((e as RuntimeOpeningCashOverride).amount)}`);
        break;
      case 'INVESTMENT_DEPOSIT': {
        const dep = e as RuntimeInvestmentDeposit;
        const acct = config.investments.accounts.find((a) => a.id === dep.accountId);
        lines.push(`Investment deposit ${formatMoney(dep.amount)} to ${acct?.name ?? 'account'} in ${dep.month}`);
        break;
      }
      case 'INVESTMENT_WITHDRAWAL': {
        const wd = e as RuntimeInvestmentWithdrawal;
        const acct = config.investments.accounts.find((a) => a.id === wd.accountId);
        lines.push(`Investment withdrawal ${formatMoney(wd.amount)} from ${acct?.name ?? 'account'} in ${wd.month}`);
        break;
      }
      case 'ACCOUNT_AMOUNT_OVERRIDE': {
        const ao = e as RuntimeAccountAmountOverride;
        const acct = config.investments.accounts.find((a) => a.id === ao.accountId);
        lines.push(`Contribution override for ${acct?.name ?? 'account'}: ${formatMoney(ao.amount)}/mo from ${ao.startMonth} to ${ao.endMonth}`);
        break;
      }
      case 'ACCOUNT_RETURN_OVERRIDE': {
        const ro = e as RuntimeAccountReturnOverride;
        const acct = config.investments.accounts.find((a) => a.id === ro.accountId);
        lines.push(`Return override for ${acct?.name ?? 'account'}: ${ro.annualReturn}% p.a. from ${ro.startMonth} to ${ro.endMonth}`);
        break;
      }
      case 'FD': {
        const fd = e as RuntimeFixedDeposit;
        lines.push(`New FD "${fd.name}": ${formatMoney(fd.principal)} at ${fd.rate}% for ${fd.durationMonths} months from ${fd.startMonth}`);
        break;
      }
      case 'RD': {
        const rd = e as RuntimeRecurringDeposit;
        lines.push(`New RD "${rd.name}": ${formatMoney(rd.monthlyContribution)}/mo at ${rd.rate}% for ${rd.durationMonths} months from ${rd.startMonth}`);
        break;
      }
    }
  }

  // Number each entry (1-based) in runtimeEvents order. The model uses this number
  // as the `ref` when editing/deleting a change, and it keeps "what's active" lists
  // unambiguous. MUST stay index-aligned with overrides.runtimeEvents (and with the
  // scenarioEventIds the store passes to validateAction).
  return lines.map((line, i) => `${i + 1}. ${line}`);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildContextPack(
  result: SimulationResult,
  config: PlannerConfig,
  overrides: PlannerOverrides,
  baselineAccountIds: string[],
  focusWindow?: { from: string; to: string },
  baseResult?: SimulationResult,
): ContextPack {
  const { summary } = result;
  const hasActiveScenario = (overrides.runtimeEvents?.length ?? 0) > 0;

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
      hasActiveScenario,
      generatedFor: hasActiveScenario ? 'scenario' : 'base',
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
    series: buildFullSeries(result, focusWindow?.from, focusWindow?.to),
    accounts,
    instruments,
    scenarioChanges: buildScenarioChanges(config, overrides),
    // Base-vs-scenario effect, grounded in a real base-plan simulation. Only when a
    // scenario is active AND the caller supplied the base run (see aiStore).
    scenarioEffect:
      hasActiveScenario && baseResult
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
