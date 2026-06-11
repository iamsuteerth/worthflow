import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

import { z } from "zod";

const ImportedPlanSchema =
  z.object({
    version:
      z.literal(1),

    baseConfig:
      z.object({
        forecast:
          z.object({
            startMonth:
              z.string(),

            totalMonths:
              z.number(),
          }),

        income:
          z.object({
            monthly:
              z.number(),
          }),

        cash:
          z.object({
            openingBalance:
              z.number(),
          }),

        expenses:
          z.any(),

        investments:
          z.any(),

        creditCardBills:
          z.array(z.any()),

        oneOffExpenses:
          z.array(z.any()),

        instruments:
          z.array(z.any()),

        salaryChanges:
          z.array(z.any()),

        bonusIncome:
          z.array(z.any()),
      }),

    overrides:
      z.object({
        runtimeEvents:
          z.array(z.any())
            .optional(),
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