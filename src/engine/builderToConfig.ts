import type { BuilderState } from "@/types/builder";
import type { PlannerConfig } from "@/types/config";

export function builderToConfig(state: BuilderState): PlannerConfig {
  return {
    forecast: {
      startMonth: state.startMonth,
      totalMonths: state.totalMonths,
    },
    income: {
      monthly: state.monthlyIncome,
    },
    cash: {
      openingBalance: state.openingCash,
    },
    expenses: {
      defaultMonthly: state.defaultMonthlyExpense,
      overrides: {},
    },
    investments: {
      accounts: state.investmentAccounts,
      amountOverrides: [],
      returnOverrides: [],
    },
    creditCardBills: state.creditCardBills.map((bill) => ({ ...bill })),
    oneOffExpenses: state.oneOffExpenses,
    recurringExpenses: state.recurringExpenses ?? [],
    salaryChanges: state.salaryChanges,
    bonusIncome: state.bonusIncome,
    instruments: state.instruments,
  };
}
