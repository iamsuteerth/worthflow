// src/engine/buildEffectiveConfig.ts
import type {
  PlannerConfig,
} from "@/types/config";

import type {
  PlannerOverrides,
} from "@/types/overrides";

import type {
  MonthKey,
} from "@/types/simulation";

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

  const creditCardEvents =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type ===
        "CREDIT_CARD_EXPENSE"
    ) ?? [];

  config.creditCardBills.push(
    ...creditCardEvents.map(
      (event) => ({
        id: event.id,
        month: event.month,
        amount: event.amount,
        label: event.label,
      })
    )
  );

  const investmentOverrides =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type ===
        "INVESTMENT_OVERRIDE"
    ) ?? [];

  const returnOverrides =
    overrides.runtimeEvents?.filter(
      (event) =>
        event.type ===
        "INVESTMENT_RETURN_OVERRIDE"
    ) ?? [];

  config.investments.returnOverrides.push(
    ...returnOverrides.map(
      (event) => ({
        startMonth:
          event.startMonth,

        endMonth:
          event.endMonth,

        annualReturn:
          event.annualReturn,
      })
    )
  );

  investmentOverrides.forEach(
    (event) => {
      let current =
        event.startMonth;

      if (event.startMonth > event.endMonth) {
        return;
      }

      while (
        current <=
        event.endMonth
      ) {
        config.investments.schedule[
          current
        ] = event.amount;

        const [
          year,
          month,
        ] = current
          .split("-")
          .map(Number);

        const date =
          new Date(
            year,
            month - 1,
            1
          );

        date.setMonth(
          date.getMonth() +
          1
        );

        current = `${date.getFullYear()}-${String(
          date.getMonth() +
          1
        ).padStart(
          2,
          "0"
        )}` as MonthKey;
      }
    }
  );

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