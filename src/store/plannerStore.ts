import type { PlannerConfig } from "@/types/config";
import type { InvestmentAccount } from "@/types/investmentAccount";
import type { PlannerOverrides } from "@/types/overrides";
import type {
  RuntimeEvent,
  RuntimeAccountAmountOverride,
  RuntimeAccountReturnOverride,
  RuntimeSpendingOverride,
} from "@/types/runtimeEvent";
import type { SavedScenario } from "@/types/scenario";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { isValidAnnualRange } from "@/engine/annualExpense";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { generateMonths } from "@/engine/dateUtils";
import { simulate } from "@/engine/simulate";
import { uniquifyAccountName } from "@/utils/uniquifyAccountName";

type MonthKey = PlannerConfig['forecast']['startMonth']

export type AppView = "builder" | "forecast";

// Undo/redo stacks for the scenario (override) layer. Each entry is a full snapshot of
// `overrides` at a point in time. Capped so the history can't grow unbounded.
export interface PlannerHistory {
  past: PlannerOverrides[];
  future: PlannerOverrides[];
}

export const HISTORY_LIMIT = 50;

const emptyHistory: PlannerHistory = { past: [], future: [] };

interface PlannerStore {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  config: PlannerConfig;
  savedScenarios: SavedScenario[];
  activeView: AppView;
  baselineAccountIds: string[];
  pristineSnapshot: string;
  baselineConfig: PlannerConfig;
  history: PlannerHistory;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

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

  tagAppliedChange: (changeId: string, proposalId: string) => void;

  setOverrides: (overrides: Partial<PlannerOverrides>) => void;
  resetOverrides: () => void;
  resetAll: () => void;
  resetForSignOut: () => void;
  markSaved: () => void;
  isPlanDirty: () => boolean;
  loadPlan: (
    baseConfig: PlannerConfig,
    overrides: PlannerOverrides,
    scenarios?: SavedScenario[],
    history?: PlannerHistory
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

function serializePristine(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides,
  savedScenarios: SavedScenario[]
): string {
  return JSON.stringify({ baseConfig, overrides, savedScenarios });
}

const initialPristine = serializePristine(initialConfig, {}, []);

function commit(
  s: { baseConfig: PlannerConfig; overrides: PlannerOverrides; history: PlannerHistory },
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides
): {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  config: PlannerConfig;
  history: PlannerHistory;
} {
  const past = [...s.history.past, structuredClone(s.overrides)].slice(-HISTORY_LIMIT);
  return {
    baseConfig,
    overrides,
    config: buildEffectiveConfig(baseConfig, overrides),
    history: { past, future: [] },
  };
}

function appendEvent(
  current: RuntimeEvent[],
  event: RuntimeEvent
): RuntimeEvent[] {
  return [...current, event];
}

function rangesOverlap(
  startMonth: MonthKey,
  endMonth: MonthKey,
  ranges: { startMonth: MonthKey; endMonth: MonthKey }[]
): boolean {
  return ranges.some((r) => !(endMonth < r.startMonth || startMonth > r.endMonth));
}

function isRuntimeEventStructurallyValid(
  event: RuntimeEvent,
  config: PlannerConfig,
  others: RuntimeEvent[]
): boolean {
  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const inWindow = new Set<string>(months);
  const account = (id: string) => config.investments.accounts.find((a) => a.id === id);

  switch (event.type) {
    case "ONE_OFF_EXPENSE":
    case "CREDIT_CARD_EXPENSE":
    case "BONUS_INCOME":
      return inWindow.has(event.month);
    case "SALARY_CHANGE":
      return inWindow.has(event.effectiveMonth);
    case "FD":
    case "RD":
      return inWindow.has(event.startMonth);
    case "OPENING_CASH_OVERRIDE":
      return true;
    case "RECURRING_EXPENSE":
      if (!inWindow.has(event.startMonth) || !inWindow.has(event.endMonth) || event.startMonth > event.endMonth) {
        return false;
      }
      return (
        (event.frequency ?? "MONTHLY") !== "ANNUAL" ||
        isValidAnnualRange(config.forecast.startMonth, config.forecast.totalMonths, event.startMonth, event.endMonth)
      );
    case "SPENDING_OVERRIDE": {
      if (!inWindow.has(event.startMonth) || !inWindow.has(event.endMonth) || event.startMonth > event.endMonth) {
        return false;
      }
      const existing = others.filter(
        (e): e is RuntimeSpendingOverride => e.type === "SPENDING_OVERRIDE"
      );
      return !rangesOverlap(event.startMonth, event.endMonth, existing);
    }
    case "INVESTMENT_DEPOSIT":
    case "INVESTMENT_WITHDRAWAL": {
      const acct = account(event.accountId);
      return !!acct && inWindow.has(event.month) && event.month >= acct.startMonth;
    }
    case "ACCOUNT_AMOUNT_OVERRIDE": {
      const acct = account(event.accountId);
      if (
        !acct || !inWindow.has(event.startMonth) || !inWindow.has(event.endMonth) ||
        event.startMonth > event.endMonth || event.startMonth < acct.startMonth
      ) {
        return false;
      }
      const existing = others.filter(
        (e): e is RuntimeAccountAmountOverride =>
          e.type === "ACCOUNT_AMOUNT_OVERRIDE" && e.accountId === event.accountId
      );
      return !rangesOverlap(event.startMonth, event.endMonth, existing);
    }
    case "ACCOUNT_RETURN_OVERRIDE": {
      const acct = account(event.accountId);
      if (
        !acct || !inWindow.has(event.startMonth) || !inWindow.has(event.endMonth) ||
        event.startMonth > event.endMonth || event.startMonth < acct.startMonth
      ) {
        return false;
      }
      const existing = others.filter(
        (e): e is RuntimeAccountReturnOverride =>
          e.type === "ACCOUNT_RETURN_OVERRIDE" && e.accountId === event.accountId
      );
      return !rangesOverlap(event.startMonth, event.endMonth, existing);
    }
    default:
      return true;
  }
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

export function getAccountValueAtMonth(
  config: PlannerConfig,
  overrides: PlannerOverrides,
  accountId: string,
  month: MonthKey
): number {
  const result = simulate(config, overrides);
  const row = result.rows.find((r) => r.month === month);
  const snap = row?.assets.accountSnapshots.find((s) => s.accountId === accountId);
  return Math.max(0, snap?.value ?? 0);
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
      baselineConfig: initialConfig,
      history: emptyHistory,

      setActiveView: (activeView) => set({ activeView }),

      undo: () =>
        set((s) => {
          if (s.history.past.length === 0) return s;
          const previous = s.history.past[s.history.past.length - 1];
          const past = s.history.past.slice(0, -1);
          const future = [structuredClone(s.overrides), ...s.history.future].slice(0, HISTORY_LIMIT);
          const overrides = structuredClone(previous);
          return {
            overrides,
            config: buildEffectiveConfig(s.baseConfig, overrides),
            history: { past, future },
          };
        }),

      redo: () =>
        set((s) => {
          if (s.history.future.length === 0) return s;
          const next = s.history.future[0];
          const future = s.history.future.slice(1);
          const past = [...s.history.past, structuredClone(s.overrides)].slice(-HISTORY_LIMIT);
          const overrides = structuredClone(next);
          return {
            overrides,
            config: buildEffectiveConfig(s.baseConfig, overrides),
            history: { past, future },
          };
        }),

      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,

      addTransientOneOffExpense: (month, amount, label) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "ONE_OFF_EXPENSE", month, amount, label,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientCreditCardExpense: (month, amount, label) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "CREDIT_CARD_EXPENSE", month, amount, label,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
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
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientBonusIncome: (month, amount, description) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "BONUS_INCOME", month, amount, description,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientSalaryChange: (effectiveMonth, newMonthlyIncome, description) =>
        set((s) => {
          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "SALARY_CHANGE",
            effectiveMonth, newMonthlyIncome, description,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
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
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientOpeningCashOverride: (amount) =>
        set((s) => {
          const current = s.overrides.runtimeEvents ?? [];
          const filtered = current.filter((e) => e.type !== "OPENING_CASH_OVERRIDE");
          const events = appendEvent(filtered, {
            id: crypto.randomUUID(), type: "OPENING_CASH_OVERRIDE", amount,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientFd: (month, principal, rate, durationMonths, name) =>
        set((s) => {
          const availableCash = getAvailableCash(s.config, s.overrides, month);
          if (principal > availableCash) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "FD",
            name, principal, rate, startMonth: month, durationMonths,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientRd: (month, monthlyContribution, rate, durationMonths, name) =>
        set((s) => {
          const availableCash = getAvailableCash(s.config, s.overrides, month);
          if (monthlyContribution > availableCash) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "RD",
            name, monthlyContribution, rate, startMonth: month, durationMonths,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      createInvestmentAccount: (account) => {
        let newAccountId: string | null = null;
        set((s) => {
          if (account.openingBalance < 0 || account.defaultMonthlyContribution < 0) return s;
          if (account.openingBalance === 0 && account.defaultMonthlyContribution === 0) return s;
          if (
            account.startMonth > s.config.forecast.startMonth &&
            account.openingBalance > getAvailableCash(s.config, s.overrides, account.startMonth)
          ) {
            return s;
          }

          const existingNames = s.config.investments.accounts.map((a) => a.name);
          const id = crypto.randomUUID();
          const newAccount: InvestmentAccount = {
            ...account,
            id,
            name: uniquifyAccountName(account.name.trim(), existingNames),
          };

          const scenarioAccounts = [...(s.overrides.scenarioAccounts ?? []), newAccount];
          newAccountId = id;
          return commit(s, s.baseConfig, { ...s.overrides, scenarioAccounts });
        });
        return newAccountId;
      },

      deleteInvestmentAccount: (accountId) =>
        set((s) => {
          const scenarioAccounts = (s.overrides.scenarioAccounts ?? []).filter(
            (a) => a.id !== accountId
          );

          const isBaseAccount = s.baseConfig.investments.accounts.some((a) => a.id === accountId);
          const prevDeleted = s.overrides.deletedAccountIds ?? [];
          const deletedAccountIds =
            isBaseAccount && !prevDeleted.includes(accountId)
              ? [...prevDeleted, accountId]
              : prevDeleted;

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

          return commit(s, s.baseConfig, {
            ...s.overrides,
            scenarioAccounts,
            deletedAccountIds,
            runtimeEvents,
          });
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
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
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
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientInvestmentDeposit: (accountId, month, amount) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account || month < account.startMonth) return s;
          if (amount > getAvailableCash(s.config, s.overrides, month)) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "INVESTMENT_DEPOSIT",
            accountId, month, amount,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      addTransientInvestmentWithdrawal: (accountId, month, amount) =>
        set((s) => {
          const account = s.config.investments.accounts.find((a) => a.id === accountId);
          if (!account || month < account.startMonth) return s;
          // A withdrawal can't exceed the account's balance that month.
          if (amount > getAccountValueAtMonth(s.config, s.overrides, accountId, month)) return s;

          const events = appendEvent(s.overrides.runtimeEvents ?? [], {
            id: crypto.randomUUID(), type: "INVESTMENT_WITHDRAWAL",
            accountId, month, amount,
          });
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      updateRuntimeEvent: (id, changes) =>
        set((s) => {
          const current = s.overrides.runtimeEvents ?? [];
          const target = current.find((e) => e.id === id);
          if (!target) return s;
          const merged = { ...target, ...changes } as RuntimeEvent;
          const others = current.filter((e) => e.id !== id);
          if (!isRuntimeEventStructurallyValid(merged, s.config, others)) return s;
          const events = current.map((e) => (e.id === id ? merged : e));
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      deleteRuntimeEvent: (id) =>
        set((s) => {
          const events = (s.overrides.runtimeEvents ?? []).filter((e) => e.id !== id);
          return commit(s, s.baseConfig, { ...s.overrides, runtimeEvents: events });
        }),

      tagAppliedChange: (changeId, proposalId) =>
        set((s) => {
          let touched = false;
          const runtimeEvents = s.overrides.runtimeEvents?.map((e) => {
            if (e.id === changeId && e.sourceProposalId !== proposalId) {
              touched = true;
              return { ...e, sourceProposalId: proposalId };
            }
            return e;
          });
          const scenarioAccounts = s.overrides.scenarioAccounts?.map((a) => {
            if (a.id === changeId && a.sourceProposalId !== proposalId) {
              touched = true;
              return { ...a, sourceProposalId: proposalId };
            }
            return a;
          });
          if (!touched) return s;
          const overrides: PlannerOverrides = {
            ...s.overrides,
            ...(runtimeEvents ? { runtimeEvents } : {}),
            ...(scenarioAccounts ? { scenarioAccounts } : {}),
          };
          return { overrides, config: buildEffectiveConfig(s.baseConfig, overrides) };
        }),

      setOverrides: (incoming) =>
        set((s) => {
          const overrides = { ...s.overrides, ...incoming };
          return commit(s, s.baseConfig, overrides);
        }),

      loadPlan: (baseConfig, overrides, scenarios = [], history = emptyHistory) => {
        set({
          baseConfig,
          overrides,
          savedScenarios: scenarios,
          config: buildEffectiveConfig(baseConfig, overrides),
          baselineAccountIds: captureBaselineAccountIds(baseConfig),
          pristineSnapshot: serializePristine(baseConfig, overrides, scenarios),
          baselineConfig: structuredClone(baseConfig),
          history,
        });
      },

      loadGeneratedPlan: (baseConfig) =>
        set({
          baseConfig,
          overrides: {},
          savedScenarios: [],
          config: buildEffectiveConfig(baseConfig, {}),
          baselineAccountIds: captureBaselineAccountIds(baseConfig),
          pristineSnapshot: "",
          baselineConfig: structuredClone(baseConfig),
          history: emptyHistory,
        }),

      resetOverrides: () =>
        set((s) => {
          const baseConfig = structuredClone(s.baselineConfig);
          return {
            baseConfig,
            overrides: {},
            config: buildEffectiveConfig(baseConfig, {}),
            baselineAccountIds: captureBaselineAccountIds(baseConfig),
            history: emptyHistory,
          };
        }),

      resetAll: () =>
        set({
          baseConfig: initialConfig,
          overrides: {},
          config: initialConfig,
          savedScenarios: [],
          baselineAccountIds: captureBaselineAccountIds(initialConfig),
          pristineSnapshot: serializePristine(initialConfig, {}, []),
          baselineConfig: initialConfig,
          history: emptyHistory,
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
          baselineConfig: initialConfig,
          history: emptyHistory,
        })
        usePlannerStore.persist.clearStorage()
      },

      markSaved: () => {
        const s = get()
        set({
          pristineSnapshot: serializePristine(s.baseConfig, s.overrides, s.savedScenarios),
          baselineConfig: structuredClone(s.baseConfig),
        })
      },

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
          // Loading a saved scenario starts a FRESH undo/redo timeline. Folding the
          // previous overrides into history.past would let undo cross between unrelated
          // scenarios (and strand a redo-with-no-changes banner). The changes carry
          // over; only the history resets.
          const overrides = structuredClone(scenario.overrides);
          return {
            overrides,
            config: buildEffectiveConfig(s.baseConfig, overrides),
            history: emptyHistory,
          };
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
        baselineConfig: s.baselineConfig,
        history: s.history,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PlannerStore>;
        const baseConfig = p.baseConfig ?? current.baseConfig;
        const overrides = p.overrides ?? current.overrides;
        const savedScenarios = p.savedScenarios ?? current.savedScenarios;
        const baselineAccountIds = p.baselineAccountIds ?? captureBaselineAccountIds(baseConfig);
        const pristineSnapshot = p.pristineSnapshot ?? serializePristine(baseConfig, overrides, savedScenarios);
        const baselineConfig = p.baselineConfig ?? baseConfig;
        const history = p.history ?? emptyHistory;
        return {
          ...current,
          ...p,
          baseConfig,
          overrides,
          savedScenarios,
          baselineAccountIds,
          pristineSnapshot,
          baselineConfig,
          history,
          config: buildEffectiveConfig(baseConfig, overrides),
        };
      },
    }
  )
);
