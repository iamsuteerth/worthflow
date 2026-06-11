import type { MonthKey } from "./simulation";

export type EventType =
  | "ONE_OFF_EXPENSE"
  | "FD_CREATED"
  | "FD_MATURED"
  | "RD_CREATED"
  | "RD_MATURED"
  | "BONUS_INCOME"
  | "SALARY_CHANGE";

export interface FinancialEvent {
  id: string;

  month: MonthKey;

  type: EventType;

  amount: number;

  description: string;
}