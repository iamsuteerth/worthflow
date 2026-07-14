import type { BuilderState } from "@/types/builder";
import type { PlannerConfig } from "@/types/config";
import type { InvestmentAccount } from "@/types/investmentAccount";
import type { RecurringExpense } from "@/types/recurringExpense";
import type { MonthKey } from "@/types/simulation";

import { isValidAnnualRange, getMaxAnnualYears, deriveAnnualEndMonth } from "@/engine/annualExpense";
import { forecastEndMonth } from "@/engine/dateUtils";

// Investment accounts and dated events must sit inside the forecast window. FD/RD
// instruments are deliberately exempt — they may start before the window and only their
// in-window cashflow/maturity matters. This module is the
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

// ── Snapping (the "Move into window" quick-fix) ────────────────────────────────
// Pure — returns corrected copies, never mutates. The decision:
// point events clamp into [start, end]; recurring ranges shift start in and clamp or refit end.

function clampMonth(month: MonthKey, start: MonthKey, end: MonthKey): MonthKey {
  if (month < start) return start;
  if (month > end) return end;
  return month;
}

// Whole calendar-month gap between two MonthKeys (b − a), independent of any window.
function monthGap(a: MonthKey, b: MonthKey): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

function snapRecurring(r: RecurringExpense, start: MonthKey, totalMonths: number): RecurringExpense {
  const end = forecastEndMonth(start, totalMonths);
  const startMonth = clampMonth(r.startMonth, start, end);

  if ((r.frequency ?? "MONTHLY") === "ANNUAL") {
    // Preserve the intended number of yearly charges, refit to what the window allows.
    const years = Math.max(1, Math.floor(monthGap(r.startMonth, r.endMonth) / 12) + 1);
    const maxYears = Math.max(1, getMaxAnnualYears(start, totalMonths, startMonth));
    return { ...r, startMonth, endMonth: deriveAnnualEndMonth(startMonth, Math.min(years, maxYears)) };
  }

  let endMonth = clampMonth(r.endMonth, start, end);
  if (endMonth < startMonth) endMonth = startMonth;
  return { ...r, startMonth, endMonth };
}

// Pull every out-of-window account/event into the window. FD/RD instruments untouched.
export function snapStateIntoWindow(state: BuilderState): BuilderState {
  const start = state.startMonth;
  const end = forecastEndMonth(start, state.totalMonths);
  const clamp = (m: MonthKey) => clampMonth(m, start, end);

  return {
    ...state,
    investmentAccounts: state.investmentAccounts.map((a) => ({ ...a, startMonth: clamp(a.startMonth) })),
    oneOffExpenses: state.oneOffExpenses.map((e) => ({ ...e, month: clamp(e.month) })),
    creditCardBills: state.creditCardBills.map((b) => ({ ...b, month: clamp(b.month) })),
    bonusIncome: state.bonusIncome.map((b) => ({ ...b, month: clamp(b.month) })),
    salaryChanges: state.salaryChanges.map((s) => ({ ...s, effectiveMonth: clamp(s.effectiveMonth) })),
    recurringExpenses: (state.recurringExpenses ?? []).map((r) => snapRecurring(r, start, state.totalMonths)),
  };
}
