import type { Instrument } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";
import type {
  SalaryChange,
  BonusIncome,
} from "@/types/incomeEvents";
import type { RecurringExpense } from "@/types/recurringExpense";
import type {
  InvestmentAccount,
  AccountAmountOverride,
  AccountReturnOverride,
} from "@/types/investmentAccount";

export interface ForecastConfig {
  startMonth: MonthKey;
  totalMonths: number;
}

export interface IncomeConfig {
  monthly: number;
}

export interface CashConfig {
  openingBalance: number;
}

export interface ExpenseConfig {
  defaultMonthly: number;
  overrides: Record<string, number>;
}

export interface InvestmentConfig {
  accounts: InvestmentAccount[];
  amountOverrides: AccountAmountOverride[];
  returnOverrides: AccountReturnOverride[];
}

export interface OneOffExpense {
  id: string;
  month: MonthKey;
  label: string;
  amount: number;
}

export interface CreditCardBill {
  id: string;
  month: MonthKey;
  amount: number;
  label: string;
}

export interface PlannerConfig {
  forecast: ForecastConfig;

  income: IncomeConfig;

  cash: CashConfig;

  expenses: ExpenseConfig;

  investments: InvestmentConfig;

  oneOffExpenses: OneOffExpense[];

  creditCardBills: CreditCardBill[];

  recurringExpenses: RecurringExpense[];

  instruments: Instrument[];

  salaryChanges: SalaryChange[];

  bonusIncome: BonusIncome[];
}
