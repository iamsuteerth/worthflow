// src/engine/buildEffectiveConfig.ts
import type { PlannerConfig } from "@/types/config";
import type { PlannerOverrides } from "@/types/overrides";
import { generateMonths } from "@/engine/dateUtils";

export function buildEffectiveConfig(
  baseConfig: PlannerConfig,
  overrides: PlannerOverrides
): PlannerConfig {
  const config = structuredClone(baseConfig);

  if (overrides.incomeMonthly !== undefined) {
    config.income.monthly = overrides.incomeMonthly;
  }
  if (overrides.openingBalance !== undefined) {
    config.cash.openingBalance = overrides.openingBalance;
  }
  if (overrides.forecastMonths !== undefined) {
    config.forecast.totalMonths = overrides.forecastMonths;
  }

  if (!overrides.runtimeEvents) return config;

  for (const event of overrides.runtimeEvents) {
    switch (event.type) {
      case "ONE_OFF_EXPENSE":
        config.oneOffExpenses.push({
          id: event.id,
          month: event.month,
          amount: event.amount,
          label: event.label,
        });
        break;

      case "CREDIT_CARD_EXPENSE":
        config.creditCardBills.push({
          id: event.id,
          month: event.month,
          amount: event.amount,
          label: event.label,
        });
        break;

      case "RECURRING_EXPENSE":
        config.recurringExpenses.push({
          id: event.id,
          name: event.name,
          amount: event.amount,
          startMonth: event.startMonth,
          endMonth: event.endMonth,
          frequency: event.frequency ?? "MONTHLY",
        });
        break;

      case "BONUS_INCOME":
        config.bonusIncome.push({
          id: event.id,
          month: event.month,
          amount: event.amount,
          description: event.description,
        });
        break;

      case "SALARY_CHANGE":
        config.salaryChanges.push({
          id: event.id,
          effectiveMonth: event.effectiveMonth,
          newMonthlyIncome: event.newMonthlyIncome,
          description: event.description,
        });
        break;

      case "FD":
        config.instruments.push({
          id: event.id,
          type: "FD" as const,
          name: event.name,
          principal: event.principal,
          rate: event.rate,
          startMonth: event.startMonth,
          durationMonths: event.durationMonths,
        });
        break;

      case "RD":
        config.instruments.push({
          id: event.id,
          type: "RD" as const,
          name: event.name,
          monthlyContribution: event.monthlyContribution,
          rate: event.rate,
          startMonth: event.startMonth,
          durationMonths: event.durationMonths,
        });
        break;

      case "ACCOUNT_AMOUNT_OVERRIDE": {
        const account = config.investments.accounts.find((a) => a.id === event.accountId);
        if (
          account &&
          event.startMonth <= event.endMonth &&
          event.startMonth >= account.startMonth
        ) {
          config.investments.amountOverrides.push({
            id: event.id,
            accountId: event.accountId,
            startMonth: event.startMonth,
            endMonth: event.endMonth,
            amount: event.amount,
          });
        }
        break;
      }

      case "ACCOUNT_RETURN_OVERRIDE": {
        const account = config.investments.accounts.find((a) => a.id === event.accountId);
        if (
          account &&
          event.startMonth <= event.endMonth &&
          event.startMonth >= account.startMonth
        ) {
          config.investments.returnOverrides.push({
            id: event.id,
            accountId: event.accountId,
            startMonth: event.startMonth,
            endMonth: event.endMonth,
            annualReturn: event.annualReturn,
          });
        }
        break;
      }

      case "SPENDING_OVERRIDE": {
        const forecastMonths = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
        for (const month of forecastMonths) {
          if (month >= event.startMonth && month <= event.endMonth) {
            config.expenses.overrides[month] = event.amount;
          }
        }
        break;
      }

      case "OPENING_CASH_OVERRIDE":
        config.cash.openingBalance = event.amount;
        break;

      // INVESTMENT_DEPOSIT and INVESTMENT_WITHDRAWAL are handled directly
      // in simulate.ts from overrides.runtimeEvents — no config mutation needed.
      default:
        break;
    }
  }

  return config;
}