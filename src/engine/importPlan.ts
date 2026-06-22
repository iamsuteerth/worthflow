import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";
import { z } from "zod";
import type { SavedScenario } from "@/types/scenario";
import type { MonthKey } from "@/types/simulation";
import { calculateChecksum } from "@/engine/checksum";
import { decodeBase64 } from "@/engine/base64";

const MonthKeySchema = z.custom<MonthKey>(
  (value) =>
    typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
);

const FixedDepositSchema = z.object({
  id: z.string(),
  type: z.literal("FD"),
  name: z.string(),
  principal: z.number().positive(),
  rate: z.number().min(0),
  startMonth: MonthKeySchema,
  durationMonths: z.number().int().positive(),
  existing: z.boolean().optional(),
});

const RecurringDepositSchema = z.object({
  id: z.string(),
  type: z.literal("RD"),
  name: z.string(),
  monthlyContribution: z.number().positive(),
  rate: z.number().min(0),
  startMonth: MonthKeySchema,
  durationMonths: z.number().int().positive(),
  existing: z.boolean().optional(),
});

const CreditCardBillSchema = z.object({
  id: z.string(),
  month: MonthKeySchema,
  amount: z.number().nonnegative(),
  label: z.string(),
});

const OneOffExpenseSchema = z.object({
  id: z.string(),
  month: MonthKeySchema,
  label: z.string(),
  amount: z.number().nonnegative(),
});

const RecurringExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().nonnegative(),
  startMonth: MonthKeySchema,
  endMonth: MonthKeySchema,
  frequency: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
});

const SalaryChangeSchema = z.object({
  id: z.string(),
  effectiveMonth: MonthKeySchema,
  newMonthlyIncome: z.number().nonnegative(),
  description: z.string(),
});

const BonusIncomeSchema = z.object({
  id: z.string(),
  month: MonthKeySchema,
  amount: z.number().nonnegative(),
  description: z.string(),
});

const RuntimeOneOffExpenseSchema = z.object({
  id: z.string(),
  type: z.literal("ONE_OFF_EXPENSE"),
  month: MonthKeySchema,
  amount: z.number().nonnegative(),
  label: z.string(),
});

const RuntimeCreditCardExpenseSchema = z.object({
  id: z.string(),
  type: z.literal("CREDIT_CARD_EXPENSE"),
  month: MonthKeySchema,
  amount: z.number().nonnegative(),
  label: z.string(),
});

const RuntimeRecurringExpenseSchema = z.object({
  id: z.string(),
  type: z.literal("RECURRING_EXPENSE"),
  name: z.string(),
  amount: z.number().nonnegative(),
  startMonth: MonthKeySchema,
  endMonth: MonthKeySchema,
  frequency: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
});

const RuntimeAccountAmountOverrideSchema = z
  .object({
    id: z.string(),
    type: z.literal("ACCOUNT_AMOUNT_OVERRIDE"),
    accountId: z.string(),
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    amount: z.number().nonnegative(),
  })
  .refine((value) => value.startMonth <= value.endMonth, {
    message: "Amount override start month must be before end month",
  });

const RuntimeAccountReturnOverrideSchema = z
  .object({
    id: z.string(),
    type: z.literal("ACCOUNT_RETURN_OVERRIDE"),
    accountId: z.string(),
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    annualReturn: z.number().min(-99.99).max(1000),
  })
  .refine((value) => value.startMonth <= value.endMonth, {
    message: "Return override start month must be before end month",
  });

const RuntimeInvestmentDepositSchema = z.object({
  id: z.string(),
  type: z.literal("INVESTMENT_DEPOSIT"),
  accountId: z.string(),
  month: MonthKeySchema,
  amount: z.number().positive(),
});

const RuntimeInvestmentWithdrawalSchema = z.object({
  id: z.string(),
  type: z.literal("INVESTMENT_WITHDRAWAL"),
  accountId: z.string(),
  month: MonthKeySchema,
  amount: z.number().positive(),
});

const RuntimeFixedDepositSchema = z.object({
  id: z.string(),
  type: z.literal("FD"),
  name: z.string(),
  principal: z.number().positive(),
  rate: z.number().min(0),
  startMonth: MonthKeySchema,
  durationMonths: z.number().int().positive(),
});

const RuntimeRecurringDepositSchema = z.object({
  id: z.string(),
  type: z.literal("RD"),
  name: z.string(),
  monthlyContribution: z.number().positive(),
  rate: z.number().min(0),
  startMonth: MonthKeySchema,
  durationMonths: z.number().int().positive(),
});

const RuntimeBonusIncomeSchema = z.object({
  id: z.string(),
  type: z.literal("BONUS_INCOME"),
  month: MonthKeySchema,
  amount: z.number().nonnegative(),
  description: z.string(),
});

const RuntimeSalaryChangeSchema = z.object({
  id: z.string(),
  type: z.literal("SALARY_CHANGE"),
  effectiveMonth: MonthKeySchema,
  newMonthlyIncome: z.number().nonnegative(),
  description: z.string(),
});

const RuntimeSpendingOverrideSchema = z
  .object({
    id: z.string(),
    type: z.literal("SPENDING_OVERRIDE"),
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    amount: z.number().nonnegative(),
  })
  .refine((value) => value.startMonth <= value.endMonth, {
    message: "Spending override start month must be before end month",
  });

const RuntimeOpeningCashOverrideSchema = z.object({
  id: z.string(),
  type: z.literal("OPENING_CASH_OVERRIDE"),
  // Negative is intentional — models starting a scenario in overdraft.
  amount: z.number().finite(),
});

// MUST list every RuntimeEvent["type"] in @/types/runtimeEvent. A missing member
// here silently rejects any saved/exported plan that uses it (the whole import
// throws "Invalid Plan File"), so an exhaustiveness test locks this union — see
// importPlan.test.ts "covers every runtime-event type".
const RuntimeEventSchema = z.discriminatedUnion("type", [
  RuntimeOneOffExpenseSchema,
  RuntimeFixedDepositSchema,
  RuntimeRecurringDepositSchema,
  RuntimeBonusIncomeSchema,
  RuntimeSalaryChangeSchema,
  RuntimeCreditCardExpenseSchema,
  RuntimeAccountAmountOverrideSchema,
  RuntimeAccountReturnOverrideSchema,
  RuntimeInvestmentDepositSchema,
  RuntimeInvestmentWithdrawalSchema,
  RuntimeRecurringExpenseSchema,
  RuntimeSpendingOverrideSchema,
  RuntimeOpeningCashOverrideSchema,
]);

// A scenario-created ("what-if") investment account — same shape as a base account.
const ScenarioAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  startMonth: MonthKeySchema,
  openingBalance: z.number().nonnegative(),
  defaultAnnualReturn: z.number().min(-99.99).max(1000),
  defaultMonthlyContribution: z.number().nonnegative(),
});

const PlannerOverridesSchema = z.object({
  runtimeEvents: z.array(RuntimeEventSchema).optional(),
  scenarioAccounts: z.array(ScenarioAccountSchema).optional(),
  deletedAccountIds: z.array(z.string()).optional(),
});

const SavedScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  overrides: PlannerOverridesSchema,
});

const WfPlanSchema = z.object({
  app: z.literal("wealth-forecast"),
  version: z.literal(3),
  exportedAt: z.string(),
  payload: z.string(),
  checksum: z.string(),
});

const ImportedPlanSchema = z.object({
  baseConfig: z.object({
    forecast: z.object({
      startMonth: MonthKeySchema,
      totalMonths: z.number().int().min(1).max(120),
    }),

    income: z.object({
      monthly: z.number().nonnegative(),
    }),

    cash: z.object({
      openingBalance: z.number().nonnegative(),
    }),

    expenses: z.object({
      defaultMonthly: z.number().nonnegative(),
      overrides: z.record(MonthKeySchema, z.number()),
    }),

    investments: z.object({
      accounts: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          startMonth: MonthKeySchema,
          openingBalance: z.number().nonnegative(),
          defaultAnnualReturn: z.number().min(-99.99).max(1000),
          defaultMonthlyContribution: z.number().nonnegative(),
        })
      ),
      amountOverrides: z.array(
        z.object({
          id: z.string(),
          accountId: z.string(),
          startMonth: MonthKeySchema,
          endMonth: MonthKeySchema,
          amount: z.number().nonnegative(),
        })
      ),
      returnOverrides: z.array(
        z.object({
          id: z.string(),
          accountId: z.string(),
          startMonth: MonthKeySchema,
          endMonth: MonthKeySchema,
          annualReturn: z.number().min(-99.99).max(1000),
        })
      ),
    }),

    creditCardBills: z.array(CreditCardBillSchema),

    oneOffExpenses: z.array(OneOffExpenseSchema),

    recurringExpenses: z.array(RecurringExpenseSchema).optional(),

    instruments: z.array(
      z.discriminatedUnion("type", [FixedDepositSchema, RecurringDepositSchema])
    ),

    salaryChanges: z.array(SalaryChangeSchema),

    bonusIncome: z.array(BonusIncomeSchema),
  }),

  savedScenarios: z.array(SavedScenarioSchema).optional(),

  overrides: PlannerOverridesSchema,
});

export type ImportedPlan = z.infer<typeof ImportedPlanSchema>;

export async function importPlan(file: File): Promise<{
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  savedScenarios?: SavedScenario[];
}> {
  if (!file.name.endsWith(".wfplan")) {
    throw new Error("Invalid plan file");
  }

  const text = await file.text();
  const wrapper = WfPlanSchema.parse(JSON.parse(text));

  if (wrapper.payload.length === 0) {
    throw new Error("Empty plan");
  }

  const checksum = await calculateChecksum(wrapper.payload);

  if (checksum !== wrapper.checksum) {
    throw new Error("Invalid checksum");
  }

  const decoded = JSON.parse(decodeBase64(wrapper.payload));

  try {
    const result = ImportedPlanSchema.parse(decoded);

    const baseConfig: PlannerConfig = {
      ...(result.baseConfig as PlannerConfig),
      recurringExpenses: result.baseConfig.recurringExpenses ?? [],
    };

    return {
      baseConfig,
      overrides: result.overrides as PlannerOverrides,
      savedScenarios: result.savedScenarios as SavedScenario[],
    };
  } catch {
    throw new Error("Invalid Plan File");
  }
}