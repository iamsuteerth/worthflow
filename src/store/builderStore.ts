import { create } from "zustand";

import type {
  BuilderState,
  InvestmentRange,
  BuilderBonusIncome,
  BuilderOneOffExpense,
  BuilderSalaryChange,
  BuilderCreditCardBill,
} from "../types/builder";

import type {
  MonthKey,
} from "../types/simulation";

import type {
  FixedDeposit,
  RecurringDeposit,
} from "../types/instrument";

const initialState: BuilderState = {
  startMonth:
    new Date()
      .toISOString()
      .slice(0, 7) as MonthKey,

  totalMonths:
    36,

  monthlyIncome:
    0,

  openingCash:
    0,

  openingInvestmentCorpus:
    0,

  defaultMonthlyExpense:
    0,

  defaultAnnualReturn:
    0,

  investmentRanges:
    [],

  creditCardBills:
    [],

  oneOffExpenses:
    [],

  salaryChanges:
    [],

  bonusIncome:
    [],

  instruments:
    [],
};

interface BuilderStore {
  state: BuilderState;

  setForecast: (
    startMonth: MonthKey,
    totalMonths: number
  ) => void;

  setBaseline: (
    monthlyIncome: number,
    openingCash: number,
    openingInvestmentCorpus: number,
    defaultMonthlyExpense: number
  ) => void;

  addInvestmentRange: (
    range: InvestmentRange
  ) => void;

  removeInvestmentRange: (
    index: number
  ) => void;

  addOneOffExpense: (
    expense: BuilderOneOffExpense
  ) => void;

  removeOneOffExpense: (
    id: string
  ) => void;

  addCreditCardBill: (
    bill: BuilderCreditCardBill
  ) => void;

  removeCreditCardBill: (
    id: string
  ) => void;

  addBonusIncome: (
    bonus: BuilderBonusIncome
  ) => void;

  removeBonusIncome: (
    id: string
  ) => void;

  addSalaryChange: (
    change: BuilderSalaryChange
  ) => void;

  removeSalaryChange: (
    id: string
  ) => void;

  addInstrument: (
    instrument:
      | FixedDeposit
      | RecurringDeposit
  ) => void;

  removeInstrument: (
    id: string
  ) => void;

  setState: (
    updater: Partial<BuilderState>
  ) => void;

  reset: () => void;
}

export const useBuilderStore =
  create<BuilderStore>(
    (set) => ({
      state:
        initialState,

      setForecast: (
        startMonth,
        totalMonths
      ) =>
        set(
          (
            store
          ) => ({
            state: {
              ...store.state,

              startMonth,

              totalMonths,
            },
          })
        ),

      setBaseline: (
        monthlyIncome,
        openingCash,
        openingInvestmentCorpus,
        defaultMonthlyExpense
      ) =>
        set(
          (
            store
          ) => ({
            state: {
              ...store.state,

              monthlyIncome,

              openingCash,

              openingInvestmentCorpus,

              defaultMonthlyExpense,
            },
          })
        ),

      addInvestmentRange:
        (range) =>
          set((store) => {
            const existing =
              store.state
                .investmentRanges;

            if (
              range.startMonth >
              range.endMonth
            ) {
              return store;
            }

            const overlap =
              existing.some(
                (current) =>
                  !(
                    range.endMonth <
                    current.startMonth ||
                    range.startMonth >
                    current.endMonth
                  )
              );

            if (overlap) {
              return store;
            }

            return {
              state: {
                ...store.state,

                investmentRanges: [
                  ...existing,
                  range,
                ],
              },
            };
          }),

      removeInvestmentRange:
        (
          index
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                investmentRanges:
                  store.state.investmentRanges.filter(
                    (
                      _,
                      i
                    ) =>
                      i !==
                      index
                  ),
              },
            })
          ),

      addOneOffExpense:
        (
          expense
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                oneOffExpenses:
                  [
                    ...store
                      .state
                      .oneOffExpenses,

                    expense,
                  ],
              },
            })
          ),

      removeOneOffExpense:
        (
          id
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                oneOffExpenses:
                  store.state.oneOffExpenses.filter(
                    (
                      expense
                    ) =>
                      expense.id !==
                      id
                  ),
              },
            })
          ),

      addCreditCardBill:
        (
          bill
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                creditCardBills: [
                  ...store.state.creditCardBills,
                  bill,
                ],
              },
            })
          ),

      removeCreditCardBill:
        (id) =>
          set((store) => ({
            state: {
              ...store.state,

              creditCardBills:
                store.state.creditCardBills.filter(
                  (bill) =>
                    bill.id !== id
                ),
            },
          })),

      addBonusIncome:
        (
          bonus
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                bonusIncome:
                  [
                    ...store
                      .state
                      .bonusIncome,

                    bonus,
                  ],
              },
            })
          ),

      removeBonusIncome:
        (
          id
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                bonusIncome:
                  store.state.bonusIncome.filter(
                    (
                      bonus
                    ) =>
                      bonus.id !==
                      id
                  ),
              },
            })
          ),

      addSalaryChange:
        (
          change
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                salaryChanges:
                  [
                    ...store
                      .state
                      .salaryChanges,

                    change,
                  ],
              },
            })
          ),

      removeSalaryChange:
        (
          id
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                salaryChanges:
                  store.state.salaryChanges.filter(
                    (
                      change
                    ) =>
                      change.id !==
                      id
                  ),
              },
            })
          ),

      addInstrument:
        (
          instrument
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                instruments: [
                  ...store.state.instruments,
                  {
                    ...instrument,

                    durationMonths:
                      Math.min(
                        120,
                        Math.max(
                          1,
                          instrument.durationMonths
                        )
                      ),
                  },
                ],
              },
            })
          ),

      removeInstrument:
        (
          id
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                instruments:
                  store.state.instruments.filter(
                    (
                      instrument
                    ) =>
                      instrument.id !==
                      id
                  ),
              },
            })
          ),

      setState:
        (
          updater
        ) =>
          set(
            (
              store
            ) => ({
              state: {
                ...store.state,

                ...updater,
              },
            })
          ),

      reset:
        () =>
          set({
            state:
              initialState,
          }),
    })
  );