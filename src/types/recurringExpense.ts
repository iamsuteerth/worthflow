import type { MonthKey } from "@/types/simulation";
 
export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  startMonth: MonthKey;
  endMonth: MonthKey;
  frequency: "MONTHLY" | "ANNUAL";
}
 