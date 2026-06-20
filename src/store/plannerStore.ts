import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PlannerConfig } from "@/types/config";
type MonthKey = PlannerConfig['forecast']['startMonth']
import type { PlannerOverrides } from "@/types/overrides";
import type { RuntimeEvent } from "@/types/runtimeEvent";
import type {
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
  RuntimeSpendingOverride,
} from "@/types/runtimeEvent";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { simulate } from "@/engine/simulate";
import { isValidAnnualRange } from "@/engine/annualExpense";
import { generateMonths } from "@/engine/dateUtils";
import type { SavedScenario } from "@/types/scenario";
import type { InvestmentAccount } from "@/types/investmentAccount";
import { uniquifyAccountName } from "@/utils/uniquifyAccountName";

export type AppView = "builder" | "forecast";

interface PlannerStore {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  config: PlannerConfig;
  savedScenarios: SavedScenario[];
  activeView: AppView;
  baselineAccountIds: string[];
  pristineSnapshot: string;

  setActiveView: (view: AppView) => void;

  addTransientOneOffExpense: (month: MonthKey, amount: number, label: string) => void;
  addTransientCreditCardExpense: (month: MonthKey, amount: number, label: string) => void;
  addTransientRecurringExpense: (
    name: string,
    amount: number,
    startMonth: MonthKey,
    endMonth: MonthKey,
    frequency: "MONTHLY" | "ANNUAL"
  ) => void;

  addTransientBonusIncome: (month: MonthKey, amount: number, description: string) => void;
  addTransientSalaryChange: (
    effectiveMonth: MonthKey,
    newMonthlyIncome: number,
    description: string
  ) => void;

  addTransientSpendingOverride: (
    startMonth: MonthKey,
    endMonth: MonthKey,
    amount: number
  ) => void;
  addTransientOpeningCashOverride: (amount: number) => void;

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

  createInvestmentAccount: (account: Omit<InvestmentAccount, "id">) => string | null;
  deleteInvestmentAccount: (accountId: string) => void;

  addTransientAccountAmountOverride: (
    accountId: string,
    startMonth: MonthKey,
    endMonth: MonthKey,
    amount: number
  ) => void;
  addTransientAccountReturnOverride: (
    accountId: string,
    startMonth: MonthKey,
    endMonth: MonthKey,
    annualReturn: number
  ) => void;
  addTransientInvestmentDeposit: (accountId: string, month: MonthKey, amount: number) => void;
  addTransientInvestmentWithdrawal: (accountId: string, month: MonthKey, amount: number) => void;

  updateRuntimeEvent: (id: string, changes: Partial<RuntimeEvent>) => void;
  deleteRuntimeEvent: (id: string) => void;

  setOverrides: (overrides: Partial<PlannerOverrides>) => void;
  resetOverrides: () => void;
  resetAll: () => void;
  resetForSignOut: () => void;
  markSaved: () => void;
  isPlanDirty: () => boolean;
  loadPlan: (
    baseConfig: PlannerConfig,
    overrides: PlannerOverrides,
    scenarios?: SavedScenario[]
  ) => void;
  loadGeneratedPlan: (baseConfig: PlannerConfig) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
}

function currentMonthKey(): PlannerConfig['forecast']['startMonth'] {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` as PlannerConfig['forecast']['startMonth']
}

const initialConfig: PlannerConfig = {
  forecast: { startMonth: currentMonthKey(), totalMonths: 36 },
  income: { monthly: 0 },
  cash: { openingBalance: 0 },
  expenses: { defaultMonthly: 0, overrides: {} },
  investments: { accounts: [], amountOverrides: [], returnOverrides: [] },
  oneOffExpenses: [],
  creditCardBills: [],
  recurringExpenses: [],
  instruments: [],
  salaryChanges: [],
  bonusIncome: [],
};

function captureBaselineAccountIds(config: PlannerConfig): string[] {
  return config.investments.accounts.map((a) => a.id);
}

// Serializes exactly what a saved .wfplan captures (see cloudStore.serializePlan),
// so the pristine snapshot can be compared 1:1 against the live plan to detect edits.
function serializePristine(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides,
  savedScenarios: SavedScenario[]
): string {
  return JSON.stringify({ baseConfig, overrides, savedScenarios });
}

const initialPristine = serializePristine(initialConfig, {}, []);

function rebuild(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides
): { baseConfig: PlannerConfig; overrides: PlannerOverrides; config: PlannerConfig } {
  return { baseConfig, overrides, config: buildEffectiveConfig(baseConfig, overrides) };
}

function appendEvent(
  current: RuntimeEvent[],
  event: RuntimeEvent
): RuntimeEvent[] {
  return [...current, event];
}

export function getAvailableCash(
  config: PlannerConfig,
  overrides: PlannerOverrides,
  month: MonthKey
): number {
  const result = simulate(config, overrides);
  const row = result.rows.find((r) => r.month === month);
  return Math.floor(Math.max(0, row?.closingBalance ?? 0));
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      baseConfig: initialConfig,
      overrides: {},
      config: initialConfig,
      savedScenarios: [],
      activeView: "builder",
      baselineAccountIds: captureBaselineAccountIds(initialConfig),
      pristineSnapshot: initialPristine,

      setActiveView: (activeView) => set({ activeView }),

      addTransientOneOffExpense: (month, amount, label) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "ONE_OFF_EXPENSE", month, amount, label,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientCreditCardExpense: (month, amount, label) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "CREDIT_CARD_EXPENSE", month, amount, label,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientRecurringExpense: (name, amount, startMonth, endMonth, frequency) =>
        set((s) => {
          if (startMonth > endMonth) return s;
          if (
            frequency === "ANNUAL" &&
            !isValidAnnualRange(s.config.forecast.startMonth, s.config.forecast.totalMonths, startMonth, endMonth)
          ) {
            return s;
          }
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "RECURRING_EXPENSE",
            name, amount, startMonth, endMonth, frequency,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientBonusIncome: (month, amount, description) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "BONUS_INCOME", month, amount, description,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientSalaryChange: (effectiveMonth, newMonthlyIncome, description) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "SALARY_CHANGE",
            effectiveMonth, newMonthlyIncome, description,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientSpendingOverride: (startMonth, endMonth, amount) =>
        set((s) => {
          if (startMonth > endMonth) return s;
          const forecastMonths = generateMonths(s.config.forecast.startMonth, s.config.forecast.totalMonths);
          const forecastStart = forecastMonths[0];
          const forecastEnd = forecastMonths[forecastMonths.length - 1];
          if (startMonth < forecastStart || endMonth > forecastEnd) return s;

          const current = s.overrides.runtimeEvents ?? [];
          const existing = current.filter(
            (e): e is RuntimeSpendingOverride => e.type === "SPENDING_OVERRIDE"
          );
          const overlap = existing.some(
            (e) => !(endMonth < e.startMonth || startMonth > e.endMonth)
          );
          if (overlap) return s;

          const events = appendEvent(current, {
            id: crypto.randomUUID(), type: "SPENDING_OVERRIDE",
            startMonth, endMonth, amount,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientOpeningCashOverride: (amount) =>
        set((s) => {
          const current = s.overrides.runtimeEvents ?? [];
          const filtered = current.filter((e) => e.type !== "OPENING_CASH_OVERRIDE");
          const events = appendEvent(filtered, {
            id: crypto.randomUUID(), type: "OPENING_CASH_OVERRIDE", amount,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientFd: (month, principal, rate, durationMonths, name) =>
        set((s) => {
          const availableCash = getAvailableCash(s.config, s.overrides, month);
          if (principal > availableCash) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "FD",
            name, principal, rate, startMonth: month, durationMonths,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientRd: (month, monthlyContribution, rate, durationMonths, name) =>
        set((s) => {
          const availableCash = getAvailableCash(s.config, s.overrides, month);
          if (monthlyContribution > availableCash) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "RD",
            name, monthlyContribution, rate, startMonth: month, durationMonths,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      createInvestmentAccount: (account) => {
        let newAccountId: string | null = null;
        set((s) => {
          if (account.openingBalance < 0 || account.defaultMonthlyContribution < 0) return s;
          if (account.openingBalance === 0 && account.defaultMonthlyContribution === 0) return s;

          const existingNames = s.baseConfig.investments.accounts.map((a) => a.name);
          const id = crypto.randomUUID();
          const newAccount: InvestmentAccount = {
            ...account,
            id,
            name: uniquifyAccountName(account.name.trim(), existingNames),
          };

          const baseConfig = structuredClone(s.baseConfig);
          baseConfig.investments.accounts.push(newAccount);
          newAccountId = id;
          return rebuild(baseConfig, s.overrides);
        });
        return newAccountId;
      },

      deleteInvestmentAccount: (accountId) =>
        set((s) => {
          const baseConfig = structuredClone(s.baseConfig);
          baseConfig.investments.accounts = baseConfig.investments.accounts.filter(
            (a) => a.id !== accountId
          );
          baseConfig.investments.amountOverrides = baseConfig.investments.amountOverrides.filter(
            (o) => o.accountId !== accountId
          );
          baseConfig.investments.returnOverrides = baseConfig.investments.returnOverrides.filter(
            (o) => o.accountId !== accountId
          );

          const runtimeEvents = (s.overrides.runtimeEvents ?? []).filter((e) => {
            if (
              e.type === "ACCOUNT_AMOUNT_OVERRIDE" ||
              e.type === "ACCOUNT_RETURN_OVERRIDE" ||
              e.type === "INVESTMENT_DEPOSIT" ||
              e.type === "INVESTMENT_WITHDRAWAL"
            ) {
              return e.accountId !== accountId;
            }
            return true;
          });

          return rebuild(baseConfig, { ...s.overrides, runtimeEvents });
        }),

      addTransientAccountAmountOverride: (accountId, startMonth, endMonth, amount) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account) return s;
          if (startMonth > endMonth || startMonth < account.startMonth) return s;

          const current = s.overrides.runtimeEvents ?? [];
          const existing = current.filter(
            (e): e is RuntimeAccountAmountOverride =>
              e.type === "ACCOUNT_AMOUNT_OVERRIDE" && e.accountId === accountId
          );
          const overlap = existing.some(
            (e) => !(endMonth < e.startMonth || startMonth > e.endMonth)
          );
          if (overlap) return s;

          const events = appendEvent(current, {
            id: crypto.randomUUID(), type: "ACCOUNT_AMOUNT_OVERRIDE",
            accountId, startMonth, endMonth, amount,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientAccountReturnOverride: (accountId, startMonth, endMonth, annualReturn) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account) return s;
          if (startMonth > endMonth || startMonth < account.startMonth) return s;

          const current = s.overrides.runtimeEvents ?? [];
          const existing = current.filter(
            (e): e is RuntimeAccountReturnOverride =>
              e.type === "ACCOUNT_RETURN_OVERRIDE" && e.accountId === accountId
          );
          const overlap = existing.some(
            (e) => !(endMonth < e.startMonth || startMonth > e.endMonth)
          );
          if (overlap) return s;

          const events = appendEvent(current, {
            id: crypto.randomUUID(), type: "ACCOUNT_RETURN_OVERRIDE",
            accountId, startMonth, endMonth, annualReturn,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientInvestmentDeposit: (accountId, month, amount) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account || month < account.startMonth) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "INVESTMENT_DEPOSIT",
            accountId, month, amount,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientInvestmentWithdrawal: (accountId, month, amount) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account || month < account.startMonth) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "INVESTMENT_WITHDRAWAL",
            accountId, month, amount,
          });
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      updateRuntimeEvent: (id, changes) =>
        set((s) => {
          const events = (s.overrides.runtimeEvents ?? []).map((e) =>
            e.id === id ? ({ ...e, ...changes } as RuntimeEvent) : e
          );
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      deleteRuntimeEvent: (id) =>
        set((s) => {
          const events = (s.overrides.runtimeEvents ?? []).filter((e) => e.id !== id);
          return rebuild(s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      setOverrides: (incoming) =>
        set((s) => {
          const overrides = { ...s.overrides, ...incoming };
          return rebuild(s.baseConfig, overrides);
        }),

      loadPlan: (baseConfig, overrides, scenarios = []) => {
        set({
          baseConfig,
          overrides,
          savedScenarios: scenarios,
          config: buildEffectiveConfig(baseConfig, overrides),
          baselineAccountIds: captureBaselineAccountIds(baseConfig),
          pristineSnapshot: serializePristine(baseConfig, overrides, scenarios),
        });
      },

      // Loads a freshly builder-generated plan. Unlike loadPlan (used for cloud saves,
      // which ARE the clean baseline), this leaves the plan DIRTY until a real cloud
      // save calls markSaved(). pristineSnapshot = "" is the "no saved baseline yet"
      // sentinel: serializePristine always returns a "{...}" JSON string, so the plan
      // reads as dirty and autoLoadLatest() will preserve it across a refresh.
      loadGeneratedPlan: (baseConfig) =>
        set({
          baseConfig,
          overrides: {},
          savedScenarios: [],
          config: buildEffectiveConfig(baseConfig, {}),
          baselineAccountIds: captureBaselineAccountIds(baseConfig),
          pristineSnapshot: "",
        }),

      resetOverrides: () =>
        set((s) => ({
          overrides: {},
          config: buildEffectiveConfig(s.baseConfig, {}),
        })),

      resetAll: () =>
        set({
          baseConfig: initialConfig,
          overrides: {},
          config: initialConfig,
          baselineAccountIds: captureBaselineAccountIds(initialConfig),
          pristineSnapshot: serializePristine(initialConfig, {}, get().savedScenarios),
        }),

      resetForSignOut: () => {
        set({
          baseConfig: initialConfig,
          overrides: {},
          config: initialConfig,
          savedScenarios: [],
          baselineAccountIds: captureBaselineAccountIds(initialConfig),
          activeView: 'builder',
          pristineSnapshot: initialPristine,
        })
        usePlannerStore.persist.clearStorage()
      },

      // Marks the current plan as the saved baseline (call after a successful cloud save).
      markSaved: () => {
        const s = get()
        set({ pristineSnapshot: serializePristine(s.baseConfig, s.overrides, s.savedScenarios) })
      },

      // True when the live plan differs from the last loaded/saved baseline.
      // Computed on demand (not reactive) so it costs nothing during editing.
      isPlanDirty: () => {
        const s = get()
        return serializePristine(s.baseConfig, s.overrides, s.savedScenarios) !== s.pristineSnapshot
      },

      saveScenario: (name) =>
        set((s) => ({
          savedScenarios: [
            ...s.savedScenarios,
            {
              id: crypto.randomUUID(),
              name,
              createdAt: new Date().toISOString(),
              overrides: structuredClone(s.overrides),
            },
          ],
        })),

      loadScenario: (id) =>
        set((s) => {
          const scenario = s.savedScenarios.find((sc) => sc.id === id);
          if (!scenario) return {};
          return rebuild(s.baseConfig, scenario.overrides);
        }),

      deleteScenario: (id) =>
        set((s) => ({
          savedScenarios: s.savedScenarios.filter((sc) => sc.id !== id),
        })),
    }),
    {
      name: "worth-flow-state-v3",
      partialize: (s) => ({
        baseConfig: s.baseConfig,
        overrides: s.overrides,
        savedScenarios: s.savedScenarios,
        activeView: s.activeView,
        baselineAccountIds: s.baselineAccountIds,
        pristineSnapshot: s.pristineSnapshot,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PlannerStore>;
        const baseConfig = p.baseConfig ?? current.baseConfig;
        const overrides = p.overrides ?? current.overrides;
        const savedScenarios = p.savedScenarios ?? current.savedScenarios;
        const baselineAccountIds = p.baselineAccountIds ?? captureBaselineAccountIds(baseConfig);
        // Pre-existing persisted state (before this field) is treated as clean.
        const pristineSnapshot =
          p.pristineSnapshot ?? serializePristine(baseConfig, overrides, savedScenarios);
        return {
          ...current,
          ...p,
          baseConfig,
          overrides,
          savedScenarios,
          baselineAccountIds,
          pristineSnapshot,
          config: buildEffectiveConfig(baseConfig, overrides),
        };
      },
    }
  )
);
