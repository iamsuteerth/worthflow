import type { BuilderState } from "@/types/builder";
import type { PlannerConfig } from "@/types/config";

// Inverse of builderToConfig: rebuilds the wizard draft from a generated/loaded
// baseConfig. Override-layer data (expenses.overrides, investments.*Overrides,
// runtime what-if events) is NOT represented in the builder and is dropped here
// by design — the builder edits the baseline only.
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
