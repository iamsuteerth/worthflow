import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

import { z } from "zod";

const MonthKeySchema =
  z.string().regex(
    /^\d{4}-(0[1-9]|1[0-2])$/
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
    month:
      MonthKeySchema,
    amount:
      z.number().nonnegative(),
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

    overrides: z.object({
      runtimeEvents:
        z.array(
          z.unknown()
        ).optional(),
    }),
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
  };
}