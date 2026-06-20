import type { PlannerConfig } from "@/types/config";
import type { MonthKey } from "@/types/simulation";
import type { AccountSnapshot } from "@/types/investmentAccount";
import type {
  RuntimeInvestmentDeposit,
  RuntimeInvestmentWithdrawal,
} from "@/types/runtimeEvent";

export function getAccountReturn(
  config: PlannerConfig,
  accountId: string,
  month: MonthKey
): number {
  const account = config.investments.accounts.find((a) => a.id === accountId);
  if (!account) return 0;

  const override = config.investments.returnOverrides.find(
    (o) =>
      o.accountId === accountId &&
      month >= o.startMonth &&
      month <= o.endMonth
  );

  return override?.annualReturn ?? account.defaultAnnualReturn;
}

export function getAccountContribution(
  config: PlannerConfig,
  accountId: string,
  month: MonthKey
): number {
  const account = config.investments.accounts.find((a) => a.id === accountId);
  if (!account) return 0;

  const override = config.investments.amountOverrides.find(
    (o) =>
      o.accountId === accountId &&
      month >= o.startMonth &&
      month <= o.endMonth
  );

  return override?.amount ?? account.defaultMonthlyContribution;
}

export interface AccountMonthResult {
  accountBalances: Record<string, number>;
  totalContribution: number;
  accountSnapshots: AccountSnapshot[];
  /** negative = outflow, positive = inflow */
  xirrEntries: { amount: number; date: Date; accountId: string }[];
}

export function processAccountMonth(
  config: PlannerConfig,
  accountBalances: Record<string, number>,
  month: MonthKey,
  deposits: RuntimeInvestmentDeposit[],
  withdrawals: RuntimeInvestmentWithdrawal[],
  // The opening balance actually seeded for an account starting this month. `simulate`
  // supplies this for future-dated accounts, where the opening is funded from cash and
  // clamped to what's available. When absent, the configured opening is used (the
  // pre-existing-wealth case for accounts that start at the forecast start).
  seededOpenings?: Record<string, number>
): AccountMonthResult {
  const accounts = config.investments.accounts;
  const updated = { ...accountBalances };
  let totalContribution = 0;
  const xirrEntries: { amount: number; date: Date; accountId: string }[] = [];
  const date = new Date(`${month}-01`);

  for (const account of accounts) {
    if (month < account.startMonth) {
      updated[account.id] = 0;
      continue;
    }

    if (month === account.startMonth) {
      const opening = seededOpenings?.[account.id] ?? account.openingBalance;
      updated[account.id] = opening;
      if (opening > 0) {
        xirrEntries.push({ amount: -opening, date, accountId: account.id });
      }
    }

    const annualReturn = getAccountReturn(config, account.id, month);
    const growthFactor = Math.max(0, 1 + annualReturn / 100);
    const monthlyReturn = Math.pow(growthFactor, 1 / 12) - 1;
    updated[account.id] = (updated[account.id] ?? 0) * (1 + monthlyReturn);

    const contribution = getAccountContribution(config, account.id, month);
    if (contribution > 0) {
      updated[account.id] += contribution;
      totalContribution += contribution;
      xirrEntries.push({ amount: -contribution, date, accountId: account.id });
    }

    updated[account.id] = Math.max(0, updated[account.id]);
  }

  // Deposits (cash → account). Caller is responsible for clamping
  // collective deposit amounts to available cash.
  for (const deposit of deposits) {
    const account = accounts.find((a) => a.id === deposit.accountId);
    if (!account || month < account.startMonth) continue;
    if (deposit.amount <= 0) continue;
    updated[deposit.accountId] += deposit.amount;
    xirrEntries.push({ amount: -deposit.amount, date, accountId: deposit.accountId });
  }

  for (const withdrawal of withdrawals) {
    const account = accounts.find((a) => a.id === withdrawal.accountId);
    if (!account || month < account.startMonth) continue;
    const available = Math.max(0, updated[withdrawal.accountId] ?? 0);
    const actual = Math.min(withdrawal.amount, available);
    updated[withdrawal.accountId] -= actual;
    if (actual > 0) {
      xirrEntries.push({ amount: actual, date, accountId: withdrawal.accountId });
    }
  }

  const accountSnapshots: AccountSnapshot[] = accounts.map((account) => ({
    accountId: account.id,
    name: account.name,
    value: updated[account.id] ?? 0,
  }));

  return {
    accountBalances: updated,
    totalContribution,
    accountSnapshots,
    xirrEntries,
  };
}
