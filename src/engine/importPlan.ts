import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

import { z } from "zod";
import type { SavedScenario } from "../types/scenario";
import type { MonthKey } from "../types/simulation";

const MonthKeySchema =
  z.custom<MonthKey>(
    (value) =>
      typeof value ===
      "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(
        value
      )
  );

const FixedDepositSchema =
  z.object({
    id: z.string(),
    type: z.literal("FD"),
    name: z.string(),
    principal:
      z.number().positive(),
    rate:
      z.number().min(0),
    startMonth:
      MonthKeySchema,
    durationMonths:
      z.number()
        .int()
        .positive(),
    existing:
      z.boolean()
        .optional(),
  });

const RecurringDepositSchema =
  z.object({
    id: z.string(),
    type: z.literal("RD"),
    name: z.string(),
    monthlyContribution:
      z.number().positive(),
    rate:
      z.number().min(0),
    startMonth:
      MonthKeySchema,
    durationMonths:
      z.number()
        .int()
        .positive(),
    existing:
      z.boolean()
        .optional(),
  });

const CreditCardBillSchema =
  z.object({
    id: z.string(),
    month:
      MonthKeySchema,
    amount:
      z.number().nonnegative(),
    label:
      z.string(),
  });

const OneOffExpenseSchema =
  z.object({
    id: z.string(),
    month:
      MonthKeySchema,
    label:
      z.string(),
    amount:
      z.number().nonnegative(),
  });

const SalaryChangeSchema =
  z.object({
    id: z.string(),
    effectiveMonth:
      MonthKeySchema,
    newMonthlyIncome:
      z.number().nonnegative(),
    description:
      z.string(),
  });

const BonusIncomeSchema =
  z.object({
    id: z.string(),
    month:
      MonthKeySchema,
    amount:
      z.number().nonnegative(),
    description:
      z.string(),
  });

const RuntimeOneOffExpenseSchema =
  z.object({
    id: z.string(),
    type:
      z.literal(
        "ONE_OFF_EXPENSE"
      ),
    month:
      MonthKeySchema,
    amount:
      z.number()
        .nonnegative(),
    label:
      z.string(),
  });

const RuntimeCreditCardExpenseSchema =
  z.object({
    id:
      z.string(),

    type:
      z.literal(
        "CREDIT_CARD_EXPENSE"
      ),

    month:
      MonthKeySchema,

    amount:
      z.number()
        .nonnegative(),

    label:
      z.string(),
  });

const RuntimeInvestmentOverrideSchema =
  z.object({
    id: z.string(),

    type:
      z.literal(
        "INVESTMENT_OVERRIDE"
      ),

    startMonth:
      MonthKeySchema,

    endMonth:
      MonthKeySchema,

    amount:
      z.number()
        .nonnegative(),
  });

const RuntimeFixedDepositSchema =
  z.object({
    id: z.string(),
    type:
      z.literal("FD"),
    name:
      z.string(),
    principal:
      z.number()
        .positive(),
    rate:
      z.number()
        .min(0),
    startMonth:
      MonthKeySchema,
    durationMonths:
      z.number()
        .int()
        .positive(),
  });

const RuntimeRecurringDepositSchema =
  z.object({
    id: z.string(),
    type:
      z.literal("RD"),
    name:
      z.string(),
    monthlyContribution:
      z.number()
        .positive(),
    rate:
      z.number()
        .min(0),
    startMonth:
      MonthKeySchema,
    durationMonths:
      z.number()
        .int()
        .positive(),
  });

const RuntimeBonusIncomeSchema =
  z.object({
    id: z.string(),
    type:
      z.literal(
        "BONUS_INCOME"
      ),
    month:
      MonthKeySchema,
    amount:
      z.number()
        .nonnegative(),
    description:
      z.string(),
  });

const RuntimeSalaryChangeSchema =
  z.object({
    id: z.string(),
    type:
      z.literal(
        "SALARY_CHANGE"
      ),
    effectiveMonth:
      MonthKeySchema,
    newMonthlyIncome:
      z.number()
        .nonnegative(),
    description:
      z.string(),
  });

const RuntimeEventSchema =
  z.discriminatedUnion(
    "type",
    [
      RuntimeOneOffExpenseSchema,
      RuntimeFixedDepositSchema,
      RuntimeRecurringDepositSchema,
      RuntimeBonusIncomeSchema,
      RuntimeSalaryChangeSchema,
      RuntimeCreditCardExpenseSchema,
      RuntimeInvestmentOverrideSchema,
    ]
  );

const PlannerOverridesSchema =
  z.object({
    runtimeEvents:
      z.array(
        RuntimeEventSchema
      ).optional(),
  });

const SavedScenarioSchema =
  z.object({
    id:
      z.string(),

    name:
      z.string(),

    createdAt:
      z.string(),

    overrides:
      PlannerOverridesSchema,
  });

const ImportedPlanSchema =
  z.object({
    version:
      z.literal(1),

    baseConfig: z.object({
      forecast:
        z.object({
          startMonth:
            MonthKeySchema,

          totalMonths:
            z.number()
              .int()
              .min(1)
              .max(120),
        }),

      income:
        z.object({
          monthly:
            z.number()
              .nonnegative(),
        }),

      cash:
        z.object({
          openingBalance:
            z.number().nonnegative(),
        }),

      expenses:
        z.object({
          defaultMonthly:
            z.number()
              .nonnegative(),

          overrides:
            z.record(
              MonthKeySchema,
              z.number()
            ),
        }),

      investments:
        z.object({
          openingCorpus:
            z.number()
              .nonnegative(),

          schedule:
            z.record(
              MonthKeySchema,
              z.number()
            ),
        }),

      creditCardBills:
        z.array(
          CreditCardBillSchema
        ),

      oneOffExpenses:
        z.array(
          OneOffExpenseSchema
        ),

      instruments:
        z.array(
          z.discriminatedUnion(
            "type",
            [
              FixedDepositSchema,
              RecurringDepositSchema,
            ]
          )
        ),

      salaryChanges:
        z.array(
          SalaryChangeSchema
        ),

      bonusIncome:
        z.array(
          BonusIncomeSchema
        ),
    }),

    savedScenarios:
      z.array(
        SavedScenarioSchema
      ).optional(),

    overrides:
      PlannerOverridesSchema,
  });

export type ImportedPlan =
  z.infer<
    typeof ImportedPlanSchema
  >;

export async function importPlan(
  file: File
): Promise<{
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  savedScenarios?: SavedScenario[];
}> {
  const text =
    await file.text();

  const parsed =
    JSON.parse(text);

  const result =
    ImportedPlanSchema.parse(
      parsed
    );

  return {
    baseConfig:
      result.baseConfig as PlannerConfig,

    overrides:
      result.overrides as PlannerOverrides,

    savedScenarios:
      result.savedScenarios as SavedScenario[],
  };
}