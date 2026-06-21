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
  RuntimeInvestmentDeposit,
  RuntimeInvestmentWithdrawal,
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
  RuntimeFixedDeposit,
  RuntimeRecurringDeposit,
} from '@/types/runtimeEvent';
import { MAX_CONTEXT_PACK_BYTES, SERIES_MAX_POINTS } from '@/ai/config';
import type { ContextPack, ContextPackSeriesPoint } from '@/ai/context/contextPack.types';

function formatMoney(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function roundTo(n: number, nearest: number): number {
  return Math.round(n / nearest) * nearest;
}

function xirrToPercent(xirr: number | null): number | null {
  return xirr !== null ? Math.round(xirr * 1000) / 10 : null;
}

function downSampleSeries(
  result: SimulationResult,
  maxPoints: number,
  focusFrom?: string,
  focusTo?: string,
): ContextPackSeriesPoint[] {
  let rows = result.rows;

  if (focusFrom || focusTo) {
    rows = rows.filter((r) => {
      if (focusFrom && r.month < focusFrom) return false;
      if (focusTo && r.month > focusTo) return false;
      return true;
    });
  }

  if (rows.length === 0) return [];

  const lowestMonth = result.summary.lowestBalanceMonth;
  const step = Math.max(1, Math.floor(rows.length / maxPoints));
  const sampled = new Map<string, ContextPackSeriesPoint>();

  for (let i = 0; i < rows.length; i += step) {
    const r = rows[i];
    sampled.set(r.month, {
      month: r.month,
      cash: roundTo(r.assets.cash, 100),
      netWorth: roundTo(r.assets.netWorth, 100),
    });
  }

  // Always include the lowest cash month
  const lowestRow = result.rows.find((r) => r.month === lowestMonth);
  if (lowestRow && !sampled.has(lowestMonth)) {
    sampled.set(lowestMonth, {
      month: lowestMonth,
      cash: roundTo(lowestRow.assets.cash, 100),
      netWorth: roundTo(lowestRow.assets.netWorth, 100),
    });
  }

  // Always include last row
  const lastRow = rows[rows.length - 1];
  sampled.set(lastRow.month, {
    month: lastRow.month,
    cash: roundTo(lastRow.assets.cash, 100),
    netWorth: roundTo(lastRow.assets.netWorth, 100),
  });

  return [...sampled.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

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
        lines.push(`Opening cash override: ${formatMoney(overrides.openingBalance ?? 0)}`);
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

  return lines;
}

export function buildContextPack(
  result: SimulationResult,
  config: PlannerConfig,
  overrides: PlannerOverrides,
  baselineAccountIds: string[],
  focusWindow?: { from: string; to: string },
): ContextPack {
  const { summary } = result;
  const hasActiveScenario = (overrides.runtimeEvents?.length ?? 0) > 0;

  const finalRow = result.rows[result.rows.length - 1];
  const accounts = config.investments.accounts.map((acct) => {
    const snap = finalRow.assets.accountSnapshots.find((s) => s.accountId === acct.id);
    return {
      name: acct.name,
      currentValue: roundTo(snap?.value ?? 0, 100),
      xirrPct: xirrToPercent(summary.accountXirr[acct.id] ?? null),
      totalContributions: roundTo(summary.accountContributions[acct.id] ?? 0, 100),
      addedInScenario: !baselineAccountIds.includes(acct.id),
    };
  });

  const instruments = config.instruments.map((inst) => {
    const [yearStr, monthStr] = inst.startMonth.split('-');
    const startYear = parseInt(yearStr);
    const startMonthNum = parseInt(monthStr);
    const totalMonths = startMonthNum - 1 + inst.durationMonths;
    const maturityYear = startYear + Math.floor(totalMonths / 12);
    const maturityMonthNum = (totalMonths % 12) + 1;
    const maturityMonth = `${maturityYear}-${String(maturityMonthNum).padStart(2, '0')}`;

    if (inst.type === 'FD') {
      const maturityValue = roundTo(inst.principal * Math.pow(1 + inst.rate / (4 * 100), (inst.durationMonths / 12) * 4), 100);
      return {
        kind: 'FD' as const,
        name: inst.name,
        principalOrContribution: inst.principal,
        ratePct: inst.rate,
        startMonth: inst.startMonth,
        maturityMonth,
        maturityValue,
      };
    } else {
      const maturityValue = roundTo(
        inst.monthlyContribution * inst.durationMonths * (1 + (inst.rate / 100) * (inst.durationMonths + 1) / (2 * 12)),
        100,
      );
      return {
        kind: 'RD' as const,
        name: inst.name,
        principalOrContribution: inst.monthlyContribution,
        ratePct: inst.rate,
        startMonth: inst.startMonth,
        maturityMonth,
        maturityValue,
      };
    }
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
      finalNetWorth: roundTo(summary.finalNetWorth, 100),
      finalCash: roundTo(summary.finalBalance, 100),
      finalInvestmentCorpus: roundTo(summary.finalInvestmentCorpus, 100),
      lowestCash: roundTo(summary.lowestBalance, 100),
      lowestCashMonth: summary.lowestBalanceMonth,
      portfolioXirrPct: xirrToPercent(summary.xirr),
      totalIncome: roundTo(summary.totalIncome, 100),
      totalExpenses: roundTo(summary.totalExpenses, 100),
    },
    series: downSampleSeries(result, SERIES_MAX_POINTS, focusWindow?.from, focusWindow?.to),
    accounts,
    instruments,
    scenarioChanges: buildScenarioChanges(config, overrides),
    focusWindow,
  };

  // Size guard: if the pack exceeds the byte cap, drop the series detail.
  const json = JSON.stringify(pack);
  if (json.length > MAX_CONTEXT_PACK_BYTES) {
    return { ...pack, series: [], instruments: [] };
  }

  return pack;
}

export function serializeContextPack(pack: ContextPack): string {
  return JSON.stringify(pack, null, 0);
}
