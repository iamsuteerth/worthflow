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
  // The base config as of the last load/save — the true baseline a scenario sits
  // on. Unlike overrides, creating/deleting an investment account mutates baseConfig,
  // so resetOverrides needs this snapshot to fully restore the baseline (remove
  // accounts added in the scenario, bring back ones deleted). Kept in lockstep with
  // pristineSnapshot (set at every load/save).
  baselineConfig: PlannerConfig;

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

// The simulated value of a single investment account at `month` — the cap a
// withdrawal can't exceed (mirrors AddInvestmentWithdrawalForm). Exported so the
// store guard and the AI feasibility check share one source of truth.
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
          // A future-dated account funds its opening balance from cash at its start
          // month, so (like deposits/FDs) it can't exceed the cash available then.
          // An account starting at the forecast start is wealth already held — no cap.
          if (
            account.startMonth > s.config.forecast.startMonth &&
            account.openingBalance > getAvailableCash(s.config, s.overrides, account.startMonth)
          ) {
            return s;
          }

          // A scenario-created account is a "what-if": it lives in overrides.scenarioAccounts,
          // never in baseConfig, so it stays out of the Plan Builder and is cleared by Reset.
          // Uniquify against the EFFECTIVE accounts (base + already-added scenario accounts).
          const existingNames = s.config.investments.accounts.map((a) => a.name);
          const id = crypto.randomUUID();
          const newAccount: InvestmentAccount = {
            ...account,
            id,
            name: uniquifyAccountName(account.name.trim(), existingNames),
          };

          const scenarioAccounts = [...(s.overrides.scenarioAccounts ?? []), newAccount];
          newAccountId = id;
          return rebuild(s.baseConfig, { ...s.overrides, scenarioAccounts });
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

          // The account may be a base account (removed from baseConfig above) or a
          // scenario-created one (removed here). Either way its overrides are cascaded.
          const scenarioAccounts = (s.overrides.scenarioAccounts ?? []).filter(
            (a) => a.id !== accountId
          );

          return rebuild(baseConfig, { ...s.overrides, scenarioAccounts, runtimeEvents });
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
          // A deposit moves cash into the account, so it can't exceed the cash
          // available that month (the authority for this cap; the UI form mirrors it).
          if (amount > getAvailableCash(s.config, s.overrides, month)) return s;

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
          // A withdrawal can't exceed the account's balance that month.
          if (amount > getAccountValueAtMonth(s.config, s.overrides, accountId, month)) return s;

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
          baselineConfig: structuredClone(baseConfig),
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
          baselineConfig: structuredClone(baseConfig),
        }),

      // Reset the scenario: clear all overrides AND restore the base plan to its
      // baseline, so investment accounts created during the scenario are removed and
      // any deleted baseline accounts return. Fully restores the last loaded/saved plan.
      resetOverrides: () =>
        set((s) => {
          const baseConfig = structuredClone(s.baselineConfig);
          return {
            baseConfig,
            overrides: {},
            config: buildEffectiveConfig(baseConfig, {}),
            baselineAccountIds: captureBaselineAccountIds(baseConfig),
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
        })
        usePlannerStore.persist.clearStorage()
      },

      // Marks the current plan as the saved baseline (call after a successful cloud save).
      // The current base config becomes the new baseline a later reset restores to, so an
      // account created and then SAVED is permanent (reset no longer removes it).
      markSaved: () => {
        const s = get()
        set({
          pristineSnapshot: serializePristine(s.baseConfig, s.overrides, s.savedScenarios),
          baselineConfig: structuredClone(s.baseConfig),
        })
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
        baselineConfig: s.baselineConfig,
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
        // Pre-existing persisted state (before this field) treats the current base as
        // its own baseline, so a reset is a no-op rather than wiping the plan.
        const baselineConfig = p.baselineConfig ?? baseConfig;
        return {
          ...current,
          ...p,
          baseConfig,
          overrides,
          savedScenarios,
          baselineAccountIds,
          pristineSnapshot,
          baselineConfig,
          config: buildEffectiveConfig(baseConfig, overrides),
        };
      },
    }
  )
);
