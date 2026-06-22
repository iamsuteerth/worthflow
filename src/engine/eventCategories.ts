import type { EventType } from "@/types/events";

// Shared by EventTimeline / InvestmentTimeline filter chips (#2) and any other
// FinancialEvent-type grouping. Distinct from ScenarioPanel.EVENT_CATEGORIES,
// which maps RuntimeEvent types (a different union, e.g. "FD"/"RD" creation
// events vs. simulation-emitted "FD_CREATED"/"FD_MATURED").
export type EventCategory = "Income" | "Expenses" | "Investments" | "FD" | "RD";

export const EVENT_CATEGORY_LIST: EventCategory[] = [
  "Income",
  "Expenses",
  "Investments",
  "FD",
  "RD",
];

export const FINANCIAL_EVENT_CATEGORY: Record<EventType, EventCategory> = {
  BONUS_INCOME: "Income",
  SALARY_CHANGE: "Income",
  ONE_OFF_EXPENSE: "Expenses",
  RECURRING_EXPENSE: "Expenses",
  CREDIT_CARD_EXPENSE: "Expenses",
  SPENDING_OVERRIDE: "Expenses",
  ACCOUNT_CREATED: "Investments",
  ACCOUNT_AMOUNT_OVERRIDE: "Investments",
  ACCOUNT_RETURN_OVERRIDE: "Investments",
  INVESTMENT_DEPOSIT: "Investments",
  INVESTMENT_WITHDRAWAL: "Investments",
  FD_CREATED: "FD",
  FD_MATURED: "FD",
  RD_CREATED: "RD",
  RD_MATURED: "RD",
};

export function getEventCategory(type: EventType): EventCategory {
  return FINANCIAL_EVENT_CATEGORY[type];
}
