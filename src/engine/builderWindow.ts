import type { MonthKey } from "@/types/simulation";
import type { BuilderState } from "@/types/builder";
import type { PlannerConfig } from "@/types/config";
import type { InvestmentAccount } from "@/types/investmentAccount";
import type { RecurringExpense } from "@/types/recurringExpense";

import { forecastEndMonth } from "@/engine/dateUtils";
import { isValidAnnualRange } from "@/engine/annualExpense";

// Investment accounts and dated events must sit inside the forecast window. FD/RD
// instruments are deliberately exempt — they may start before the window and only their
// in-window cashflow/maturity matters (see IMPLEMENTATION.dev.md §3). This module is the
// single source of truth for "what is out of window", mirroring the scenario-lab rule in
// plannerStore.isRuntimeEventStructurallyValid but for the *base* builder entities.
export type OutOfWindowKind =
  | "account"
  | "oneOff"
  | "creditCard"
  | "bonus"
  | "salary"
  | "recurring";

export interface OutOfWindowItem {
  kind: OutOfWindowKind;
  id: string;
  label: string;
  current: string; // "2026-07" for a point event, "2026-05 → 2027-01" for a range
}

interface WindowInputs {
  startMonth: MonthKey;
  totalMonths: number;
  accounts: InvestmentAccount[];
  oneOffExpenses: { id: string; month: MonthKey; label: string }[];
  creditCardBills: { id: string; month: MonthKey; label: string }[];
  bonusIncome: { id: string; month: MonthKey; description: string }[];
  salaryChanges: { id: string; effectiveMonth: MonthKey; description: string }[];
  recurringExpenses: RecurringExpense[];
}

// MonthKey strings compare lexicographically (see dateUtils) — inclusive on both ends.
function inWindow(month: MonthKey, start: MonthKey, end: MonthKey): boolean {
  return month >= start && month <= end;
}

function findOutOfWindow(input: WindowInputs): OutOfWindowItem[] {
  const { startMonth, totalMonths } = input;
  const end = forecastEndMonth(startMonth, totalMonths);
  const items: OutOfWindowItem[] = [];

  for (const a of input.accounts) {
    if (!inWindow(a.startMonth, startMonth, end)) {
      items.push({ kind: "account", id: a.id, label: a.name, current: a.startMonth });
    }
  }
  for (const e of input.oneOffExpenses) {
    if (!inWindow(e.month, startMonth, end)) {
      items.push({ kind: "oneOff", id: e.id, label: e.label, current: e.month });
    }
  }
  for (const b of input.creditCardBills) {
    if (!inWindow(b.month, startMonth, end)) {
      items.push({ kind: "creditCard", id: b.id, label: b.label, current: b.month });
    }
  }
  for (const b of input.bonusIncome) {
    if (!inWindow(b.month, startMonth, end)) {
      items.push({ kind: "bonus", id: b.id, label: b.description, current: b.month });
    }
  }
  for (const s of input.salaryChanges) {
    if (!inWindow(s.effectiveMonth, startMonth, end)) {
      items.push({ kind: "salary", id: s.id, label: s.description, current: s.effectiveMonth });
    }
  }
  for (const r of input.recurringExpenses ?? []) {
    // Same validity rule the builder forms and plannerStore guard use — an ANNUAL range
    // must additionally land on a whole number of years (isValidAnnualRange).
    const validRange =
      inWindow(r.startMonth, startMonth, end) &&
      inWindow(r.endMonth, startMonth, end) &&
      r.startMonth <= r.endMonth &&
      ((r.frequency ?? "MONTHLY") !== "ANNUAL" ||
        isValidAnnualRange(startMonth, totalMonths, r.startMonth, r.endMonth));
    if (!validRange) {
      items.push({
        kind: "recurring",
        id: r.id,
        label: r.name,
        current: `${r.startMonth} → ${r.endMonth}`,
      });
    }
  }

  return items;
}

export function findOutOfWindowItems(state: BuilderState): OutOfWindowItem[] {
  return findOutOfWindow({
    startMonth: state.startMonth,
    totalMonths: state.totalMonths,
    accounts: state.investmentAccounts,
    oneOffExpenses: state.oneOffExpenses,
    creditCardBills: state.creditCardBills,
    bonusIncome: state.bonusIncome,
    salaryChanges: state.salaryChanges,
    recurringExpenses: state.recurringExpenses ?? [],
  });
}

export function findOutOfWindowInConfig(config: PlannerConfig): OutOfWindowItem[] {
  return findOutOfWindow({
    startMonth: config.forecast.startMonth,
    totalMonths: config.forecast.totalMonths,
    accounts: config.investments.accounts,
    oneOffExpenses: config.oneOffExpenses,
    creditCardBills: config.creditCardBills,
    bonusIncome: config.bonusIncome,
    salaryChanges: config.salaryChanges,
    recurringExpenses: config.recurringExpenses ?? [],
  });
}

export function planHasOutOfWindowItems(config: PlannerConfig): boolean {
  return findOutOfWindowInConfig(config).length > 0;
}
