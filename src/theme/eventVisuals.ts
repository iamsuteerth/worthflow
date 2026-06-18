import type { FC } from "react";
import {
  IconAdjustments,
  IconArrowDown,
  IconArrowUp,
  IconBriefcase,
  IconBuildingBank,
  IconChartLine,
  IconCoins,
  IconPigMoney,
  IconRepeat,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";

type IconComponent = FC<{
  size?: number | string;
  stroke?: number;
  color?: string;
}>;

export type EventPolarity = "positive" | "negative" | "neutral";

export interface EventVisual {
  label: string;
  color: string;
  polarity: EventPolarity;
  Icon: IconComponent;
}

const VISUALS: Record<string, EventVisual> = {
  BONUS_INCOME: {
    label: "Bonus Income",
    color: "teal",
    polarity: "positive",
    Icon: IconCoins,
  },
  SALARY_CHANGE: {
    label: "Salary Change",
    color: "brand",
    polarity: "positive",
    Icon: IconTrendingUp,
  },
  ONE_OFF_EXPENSE: {
    label: "Expense",
    color: "red",
    polarity: "negative",
    Icon: IconArrowDown,
  },
  RECURRING_EXPENSE: {
    label: "Recurring",
    color: "red",
    polarity: "negative",
    Icon: IconRepeat,
  },
  CREDIT_CARD_EXPENSE: {
    label: "Credit Card",
    color: "orange",
    polarity: "negative",
    Icon: IconWallet,
  },
  SPENDING_OVERRIDE: {
    label: "Spending Override",
    color: "pink",
    polarity: "negative",
    Icon: IconAdjustments,
  },
  FD_CREATED: {
    label: "FD Created",
    color: "cyan",
    polarity: "negative",
    Icon: IconBuildingBank,
  },
  FD_MATURED: {
    label: "FD Matured",
    color: "teal",
    polarity: "positive",
    Icon: IconArrowUp,
  },
  RD_CREATED: {
    label: "RD Created",
    color: "grape",
    polarity: "negative",
    Icon: IconBriefcase,
  },
  RD_MATURED: {
    label: "RD Matured",
    color: "teal",
    polarity: "positive",
    Icon: IconArrowUp,
  },
  INVESTMENT_DEPOSIT: {
    label: "Portfolio Deposit",
    color: "violet",
    polarity: "negative",
    Icon: IconArrowDown,
  },
  INVESTMENT_WITHDRAWAL: {
    label: "Portfolio Withdrawal",
    color: "teal",
    polarity: "positive",
    Icon: IconArrowUp,
  },
  ACCOUNT_AMOUNT_OVERRIDE: {
    label: "Amount Override",
    color: "brand",
    polarity: "neutral",
    Icon: IconChartLine,
  },
  ACCOUNT_RETURN_OVERRIDE: {
    label: "Return Override",
    color: "grape",
    polarity: "neutral",
    Icon: IconTrendingUp,
  },
  FD: {
    label: "FD",
    color: "cyan",
    polarity: "neutral",
    Icon: IconBuildingBank,
  },
  RD: {
    label: "RD",
    color: "grape",
    polarity: "neutral",
    Icon: IconPigMoney,
  },
};

const FALLBACK: EventVisual = {
  label: "Event",
  color: "gray",
  polarity: "neutral",
  Icon: IconCoins,
};

export function getEventVisual(type: string): EventVisual {
  return VISUALS[type] ?? FALLBACK;
}

export function polarityColor(polarity: EventPolarity): string {
  if (polarity === "positive") return "teal";
  if (polarity === "negative") return "red";
  return "gray";
}
