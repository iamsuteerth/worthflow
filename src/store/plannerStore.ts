import { create } from "zustand";
import { persist } from "zustand/middleware";

import configJson from "../data/config.json";

import type { PlannerConfig } from "../types/config";
import type { PlannerOverrides } from "../types/overrides";
import { buildEffectiveConfig } from "../engine/buildEffectiveConfig";
import type { MonthKey } from "../types/simulation";

export type AppView =
  | "builder"
  | "forecast";

import type {
  SavedScenario,
} from "../types/scenario";

interface PlannerStore {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  config: PlannerConfig;
  savedScenarios: SavedScenario[];
  activeView: AppView;

  setActiveView: (
    view: AppView
  ) => void;

  addTransientOneOffExpense: (
    month: MonthKey,
    amount: number,
    label: string
  ) => void;

  addTransientCreditCardExpense: (
    month: MonthKey,
    amount: number,
    label: string
  ) => void;

  addTransientInvestmentOverride: (
    startMonth: MonthKey,
    endMonth: MonthKey,
    amount: number
  ) => void;

  addTransientFd: (
    month: MonthKey,
    principal: number,
    rate: number,
    durationMonths: number,
    name: string
  ) => void;

  addTransientRd: (
    month: MonthKey,
    monthlyContribution: number,
    rate: number,
    durationMonths: number,
    name: string
  ) => void;

  addTransientBonusIncome: (
    month: MonthKey,
    amount: number,
    description: string
  ) => void;

  addTransientSalaryChange: (
    effectiveMonth: MonthKey,
    newMonthlyIncome: number,
    description: string
  ) => void;

  setOverrides: (
    overrides: Partial<PlannerOverrides>
  ) => void;

  resetOverrides: () => void;
  resetAll: () => void;
  loadPlan: (
    baseConfig: PlannerConfig,
    overrides: PlannerOverrides,
    scenarios?: SavedScenario[],
  ) => void;
  saveScenario: (
    name: string
  ) => void;

  loadScenario: (
    id: string
  ) => void;

  deleteScenario: (
    id: string
  ) => void;
}

const initialConfig = configJson as PlannerConfig;

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      baseConfig: initialConfig,
      overrides: {},
      config: initialConfig,
      savedScenarios: [],
      activeView: "forecast",
      setActiveView: (
        activeView
      ) =>
        set({
          activeView,
        }),
      addTransientOneOffExpense: (month, amount, label) =>
        set((state) => {
          const current = state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,
            runtimeEvents: [
              ...current,
              {
                id: crypto.randomUUID(),
                type: "ONE_OFF_EXPENSE",
                month,
                amount,
                label,
              },
            ],
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      addTransientCreditCardExpense: (
        month,
        amount,
        label
      ) =>
        set((state) => {
          const current =
            state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,

            runtimeEvents: [
              ...current,

              {
                id: crypto.randomUUID(),

                type:
                  "CREDIT_CARD_EXPENSE",

                month,

                amount,

                label,
              },
            ],
          };

          return {
            overrides,

            config:
              buildEffectiveConfig(
                state.baseConfig,
                overrides
              ),
          };
        }),

      addTransientInvestmentOverride: (
        startMonth,
        endMonth,
        amount
      ) =>
        set((state) => {
          const current =
            state.overrides.runtimeEvents ?? [];

          const existingOverrides =
            current.filter(
              (event) =>
                event.type ===
                "INVESTMENT_OVERRIDE"
            );

          const overlap =
            existingOverrides.some(
              (event) =>
                !(
                  endMonth <
                  event.startMonth ||
                  startMonth >
                  event.endMonth
                )
            );

          if (
            overlap ||
            startMonth >
            endMonth
          ) {
            return state;
          }

          const overrides: PlannerOverrides = {
            ...state.overrides,

            runtimeEvents: [
              ...current,

              {
                id: crypto.randomUUID(),

                type:
                  "INVESTMENT_OVERRIDE",

                startMonth,

                endMonth,

                amount,
              },
            ],
          };

          return {
            overrides,

            config:
              buildEffectiveConfig(
                state.baseConfig,
                overrides
              ),
          };
        }),

      addTransientFd: (
        month,
        principal,
        rate,
        durationMonths,
        name
      ) =>
        set((state) => {
          const current = state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,
            runtimeEvents: [
              ...current,
              {
                id: crypto.randomUUID(),
                type: "FD",
                name,
                principal,
                rate,
                startMonth: month,
                durationMonths,
              },
            ],
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      addTransientRd: (
        month,
        monthlyContribution,
        rate,
        durationMonths,
        name
      ) =>
        set((state) => {
          const current = state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,
            runtimeEvents: [
              ...current,
              {
                id: crypto.randomUUID(),
                type: "RD",
                name,
                monthlyContribution,
                rate,
                startMonth: month,
                durationMonths,
              },
            ],
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      addTransientBonusIncome: (
        month,
        amount,
        description
      ) =>
        set((state) => {
          const current = state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,
            runtimeEvents: [
              ...current,
              {
                id: crypto.randomUUID(),
                type: "BONUS_INCOME",
                month,
                amount,
                description,
              },
            ],
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      addTransientSalaryChange: (
        effectiveMonth,
        newMonthlyIncome,
        description
      ) =>
        set((state) => {
          const current = state.overrides.runtimeEvents ?? [];

          const overrides: PlannerOverrides = {
            ...state.overrides,
            runtimeEvents: [
              ...current,
              {
                id: crypto.randomUUID(),
                type: "SALARY_CHANGE",
                effectiveMonth,
                newMonthlyIncome,
                description,
              },
            ],
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      setOverrides: (incomingOverrides) =>
        set((state) => {
          const overrides = {
            ...state.overrides,
            ...incomingOverrides,
          };

          return {
            overrides,
            config: buildEffectiveConfig(
              state.baseConfig,
              overrides
            ),
          };
        }),

      loadPlan: (
        baseConfig,
        overrides,
        scenarios = [],
      ) =>
        set({
          baseConfig,

          overrides,

          savedScenarios:
            scenarios,

          config:
            buildEffectiveConfig(
              baseConfig,
              overrides
            ),
        }),

      resetOverrides: () =>
        set((state) => ({
          overrides: {},
          config: buildEffectiveConfig(
            state.baseConfig,
            {}
          ),
        })),

      resetAll: () =>
        set({
          baseConfig: initialConfig,
          overrides: {},
          config: initialConfig,
        }),
      saveScenario: (name) =>
        set((state) => ({
          savedScenarios: [
            ...state.savedScenarios,
            {
              id: crypto.randomUUID(),
              name,
              createdAt:
                new Date().toISOString(),
              overrides:
                structuredClone(
                  state.overrides
                ),
            },
          ],
        })),
      loadScenario: (id) =>
        set((state) => {
          const scenario =
            state.savedScenarios.find(
              (s) => s.id === id
            );
          if (!scenario) {
            return {};
          }
          return {
            overrides:
              scenario.overrides,

            config:
              buildEffectiveConfig(
                state.baseConfig,
                scenario.overrides
              ),
          };
        }),
      deleteScenario: (id) =>
        set((state) => ({
          savedScenarios:
            state.savedScenarios.filter(
              (s) => s.id !== id
            ),
        })),
    }),
    {
      name:
        "finance-planner-state",

      partialize:
        (state) => ({
          baseConfig:
            state.baseConfig,

          overrides:
            state.overrides,

          savedScenarios:
            state.savedScenarios,

          activeView:
            state.activeView,
        }),

      merge: (
        persistedState,
        currentState
      ) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<PlannerStore>),
        };

        return {
          ...merged,

          config:
            buildEffectiveConfig(
              merged.baseConfig,
              merged.overrides
            ),
        };
      },
    }
  )
);