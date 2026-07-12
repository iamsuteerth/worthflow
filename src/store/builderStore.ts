import type { MonthKey } from "@/types/simulation";
import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";
import type { RecurringExpense } from "@/types/recurringExpense";
import type { InvestmentAccount } from "@/types/investmentAccount";

import { create } from "zustand";

import type {
  BuilderState,
  BuilderBonusIncome,
  BuilderOneOffExpense,
  BuilderSalaryChange,
  BuilderCreditCardBill,
} from "@/types/builder";

import { isValidAnnualRange } from "@/engine/annualExpense";
import { snapStateIntoWindow } from "@/engine/builderWindow";
import { uniquifyAccountName } from "@/utils/uniquifyAccountName";

const initialState: BuilderState = {
  startMonth: new Date().toISOString().slice(0, 7) as MonthKey,
  totalMonths: 36,
  monthlyIncome: 0,
  openingCash: 0,
  defaultMonthlyExpense: 0,
  investmentAccounts: [],
  creditCardBills: [],
  oneOffExpenses: [],
  salaryChanges: [],
  bonusIncome: [],
  recurringExpenses: [],
  instruments: [],
};

interface BuilderStore {
  state: BuilderState;

  seedSource: "base" | "effective";
  setSeedSource: (source: "base" | "effective") => void;

  setForecast: (startMonth: MonthKey, totalMonths: number) => void;

  setBaseline: (
    monthlyIncome: number,
    openingCash: number,
    defaultMonthlyExpense: number
  ) => void;

  addInvestmentAccount: (account: Omit<InvestmentAccount, "id">) => void;
  removeInvestmentAccount: (id: string) => void;

  addOneOffExpense: (expense: BuilderOneOffExpense) => void;
  removeOneOffExpense: (id: string) => void;

  addCreditCardBill: (bill: BuilderCreditCardBill) => void;
  removeCreditCardBill: (id: string) => void;

  addBonusIncome: (bonus: BuilderBonusIncome) => void;
  removeBonusIncome: (id: string) => void;

  addSalaryChange: (change: BuilderSalaryChange) => void;
  removeSalaryChange: (id: string) => void;

  addRecurringExpense: (expense: RecurringExpense) => void;
  removeRecurringExpense: (id: string) => void;

  addInstrument: (instrument: FixedDeposit | RecurringDeposit) => void;
  removeInstrument: (id: string) => void;

  updateInvestmentAccount: (account: InvestmentAccount) => void;
  updateInstrument: (instrument: FixedDeposit | RecurringDeposit) => void;
  updateOneOffExpense: (expense: BuilderOneOffExpense) => void;
  updateCreditCardBill: (bill: BuilderCreditCardBill) => void;
  updateBonusIncome: (bonus: BuilderBonusIncome) => void;
  updateSalaryChange: (change: BuilderSalaryChange) => void;
  updateRecurringExpense: (expense: RecurringExpense) => void;

  snapAllIntoWindow: () => void;

  setState: (updater: Partial<BuilderState>) => void;

  reset: () => void;
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  state: initialState,

  seedSource: "base",
  setSeedSource: (seedSource) => set({ seedSource }),

  setForecast: (startMonth, totalMonths) =>
    set((store) => ({ state: { ...store.state, startMonth, totalMonths } })),

  setBaseline: (monthlyIncome, openingCash, defaultMonthlyExpense) =>
    set((store) => ({
      state: {
        ...store.state,
        monthlyIncome,
        openingCash,
        defaultMonthlyExpense,
      },
    })),

  addInvestmentAccount: (account) =>
    set((store) => {
      if (account.openingBalance === 0 && account.defaultMonthlyContribution === 0) {
        return store;
      }

      const existingNames = store.state.investmentAccounts.map((a) => a.name);
      const newAccount: InvestmentAccount = {
        ...account,
        id: crypto.randomUUID(),
        name: uniquifyAccountName(account.name.trim(), existingNames),
      };

      return {
        state: {
          ...store.state,
          investmentAccounts: [...store.state.investmentAccounts, newAccount],
        },
      };
    }),

  removeInvestmentAccount: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        investmentAccounts: store.state.investmentAccounts.filter((a) => a.id !== id),
      },
    })),

  addOneOffExpense: (expense) =>
    set((store) => ({
      state: {
        ...store.state,
        oneOffExpenses: [...store.state.oneOffExpenses, expense],
      },
    })),

  removeOneOffExpense: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        oneOffExpenses: store.state.oneOffExpenses.filter((e) => e.id !== id),
      },
    })),

  addCreditCardBill: (bill) =>
    set((store) => ({
      state: {
        ...store.state,
        creditCardBills: [...store.state.creditCardBills, bill],
      },
    })),

  removeCreditCardBill: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        creditCardBills: store.state.creditCardBills.filter((b) => b.id !== id),
      },
    })),

  addBonusIncome: (bonus) =>
    set((store) => ({
      state: {
        ...store.state,
        bonusIncome: [...store.state.bonusIncome, bonus],
      },
    })),

  removeBonusIncome: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        bonusIncome: store.state.bonusIncome.filter((b) => b.id !== id),
      },
    })),

  addSalaryChange: (change) =>
    set((store) => ({
      state: {
        ...store.state,
        salaryChanges: [...store.state.salaryChanges, change],
      },
    })),

  removeSalaryChange: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        salaryChanges: store.state.salaryChanges.filter((c) => c.id !== id),
      },
    })),

  addRecurringExpense: (expense) =>
    set((store) => {
      if (expense.startMonth > expense.endMonth) return store;
      if (
        expense.frequency === "ANNUAL" &&
        !isValidAnnualRange(store.state.startMonth, store.state.totalMonths, expense.startMonth, expense.endMonth)
      ) {
        return store;
      }
      return {
        state: {
          ...store.state,
          recurringExpenses: [...store.state.recurringExpenses, expense],
        },
      };
    }),

  removeRecurringExpense: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        recurringExpenses: store.state.recurringExpenses.filter((e) => e.id !== id),
      },
    })),

  addInstrument: (instrument) =>
    set((store) => ({
      state: {
        ...store.state,
        instruments: [
          ...store.state.instruments,
          {
            ...instrument,
            durationMonths: Math.min(120, Math.max(1, instrument.durationMonths)),
          },
        ],
      },
    })),

  removeInstrument: (id) =>
    set((store) => ({
      state: {
        ...store.state,
        instruments: store.state.instruments.filter((i) => i.id !== id),
      },
    })),

  updateInvestmentAccount: (account) =>
    set((store) => {
      const others = store.state.investmentAccounts.filter((a) => a.id !== account.id);
      const name = uniquifyAccountName(account.name.trim(), others.map((a) => a.name));
      return {
        state: {
          ...store.state,
          investmentAccounts: store.state.investmentAccounts.map((a) =>
            a.id === account.id ? { ...account, name } : a
          ),
        },
      };
    }),

  updateInstrument: (instrument) =>
    set((store) => ({
      state: {
        ...store.state,
        instruments: store.state.instruments.map((i) =>
          i.id === instrument.id
            ? { ...instrument, durationMonths: Math.min(120, Math.max(1, instrument.durationMonths)) }
            : i
        ),
      },
    })),

  updateOneOffExpense: (expense) =>
    set((store) => ({
      state: {
        ...store.state,
        oneOffExpenses: store.state.oneOffExpenses.map((e) => (e.id === expense.id ? expense : e)),
      },
    })),

  updateCreditCardBill: (bill) =>
    set((store) => ({
      state: {
        ...store.state,
        creditCardBills: store.state.creditCardBills.map((b) => (b.id === bill.id ? bill : b)),
      },
    })),

  updateBonusIncome: (bonus) =>
    set((store) => ({
      state: {
        ...store.state,
        bonusIncome: store.state.bonusIncome.map((b) => (b.id === bonus.id ? bonus : b)),
      },
    })),

  updateSalaryChange: (change) =>
    set((store) => ({
      state: {
        ...store.state,
        salaryChanges: store.state.salaryChanges.map((c) => (c.id === change.id ? change : c)),
      },
    })),

  updateRecurringExpense: (expense) =>
    set((store) => {
      if (expense.startMonth > expense.endMonth) return store;
      if (
        expense.frequency === "ANNUAL" &&
        !isValidAnnualRange(store.state.startMonth, store.state.totalMonths, expense.startMonth, expense.endMonth)
      ) {
        return store;
      }
      return {
        state: {
          ...store.state,
          recurringExpenses: store.state.recurringExpenses.map((e) => (e.id === expense.id ? expense : e)),
        },
      };
    }),

  snapAllIntoWindow: () =>
    set((store) => ({ state: snapStateIntoWindow(store.state) })),

  setState: (updater) =>
    set((store) => ({ state: { ...store.state, ...updater } })),

  reset: () => set({ state: initialState, seedSource: "base" }),
}));
