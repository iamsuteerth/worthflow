import type { PlannerConfig } from "@/types/config";
import type { BuilderState } from "@/types/builder";

// Inverse of builderToConfig: rebuilds the wizard draft from a generated/loaded
// baseConfig. Override-layer data (expenses.overrides, investments.*Overrides,
// runtime what-if events) is NOT represented in the builder and is dropped here
// by design — the builder edits the baseline only.
//
// Every array is read defensively (`?? []`): a baseConfig rehydrated from
// localStorage by the persist `merge` (unlike importPlan) is NOT field-backfilled,
// so a plan that predates a given array — e.g. `recurringExpenses`, added in v2.0.0
// — can reach here with it undefined. The simulation path already guards these reads
// the same way; this keeps entering the Builder from throwing on a legacy plan.
export function configToBuilder(config: PlannerConfig): BuilderState {
  return {
    startMonth: config.forecast.startMonth,
    totalMonths: config.forecast.totalMonths,
    monthlyIncome: config.income.monthly,
    openingCash: config.cash.openingBalance,
    defaultMonthlyExpense: config.expenses.defaultMonthly,
    investmentAccounts: (config.investments.accounts ?? []).map((a) => ({ ...a })),
    creditCardBills: (config.creditCardBills ?? []).map((b) => ({ ...b })),
    oneOffExpenses: (config.oneOffExpenses ?? []).map((e) => ({ ...e })),
    salaryChanges: (config.salaryChanges ?? []).map((s) => ({ ...s })),
    bonusIncome: (config.bonusIncome ?? []).map((b) => ({ ...b })),
    recurringExpenses: (config.recurringExpenses ?? []).map((r) => ({ ...r })),
    instruments: (config.instruments ?? []).map((i) => ({ ...i })),
  };
}
