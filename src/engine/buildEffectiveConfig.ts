import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

export function buildEffectiveConfig(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides
): PlannerConfig {
  const config =
    structuredClone(
      baseConfig
    );

  if (
    overrides.incomeMonthly !==
    undefined
  ) {
    config.income.monthly =
      overrides.incomeMonthly;
  }

  if (
    overrides.openingBalance !==
    undefined
  ) {
    config.cash.openingBalance =
      overrides.openingBalance;
  }

  if (
    overrides.forecastMonths !==
    undefined
  ) {
    config.forecast.totalMonths =
      overrides.forecastMonths;
  }

  if (
    overrides.runtimeEvents
  ) {
    const oneOffEvents =
      overrides.runtimeEvents.filter(
        (event) =>
          event.type ===
          "ONE_OFF_EXPENSE"
      );

    config.oneOffExpenses.push(
      ...oneOffEvents.map(
        (event) => ({
          id: event.id,

          month: event.month,

          amount: event.amount,

          label: event.label,
        })
      )
    );
  }

  const fdEvents =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type === "FD"
    ) ?? [];

  config.instruments.push(
    ...fdEvents.map((fd) => ({
      id: fd.id,

      type: "FD" as const,

      name: fd.name,

      principal: fd.principal,

      rate: fd.rate,

      startMonth:
        fd.startMonth,

      durationMonths:
        fd.durationMonths,
    }))
  );

  const rdEvents =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type === "RD"
    ) ?? [];

  config.instruments.push(
    ...rdEvents.map((rd) => ({
      id: rd.id,

      type: "RD" as const,

      name: rd.name,

      monthlyContribution:
        rd.monthlyContribution,

      rate: rd.rate,

      startMonth:
        rd.startMonth,

      durationMonths:
        rd.durationMonths,
    }))
  );

  const bonusEvents =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type ===
        "BONUS_INCOME"
    ) ?? [];

  config.bonusIncome.push(
    ...bonusEvents.map(
      (bonus) => ({
        id: bonus.id,

        month: bonus.month,

        amount: bonus.amount,

        description:
          bonus.description,
      })
    )
  );

  const salaryEvents =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type ===
        "SALARY_CHANGE"
    ) ?? [];

  config.salaryChanges.push(
    ...salaryEvents.map(
      (salary) => ({
        id: salary.id,

        effectiveMonth:
          salary.effectiveMonth,

        newMonthlyIncome:
          salary.newMonthlyIncome,

        description:
          salary.description,
      })
    )
  );

  return config;
}