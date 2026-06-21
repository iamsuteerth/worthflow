export interface ContextPackMeta {
  currency: 'INR';
  horizonMonths: number;
  startMonth: string;
  hasActiveScenario: boolean;
  generatedFor: 'base' | 'scenario';
}

export interface ContextPackHeadline {
  finalNetWorth: number;
  finalCash: number;
  finalInvestmentCorpus: number;
  lowestCash: number;
  lowestCashMonth: string;
  portfolioXirrPct: number | null;
  totalIncome: number;
  totalExpenses: number;
}

/**
 * Columnar monthly series. Each array is parallel to `labels`: the value for
 * month `labels[i]` is `cash[i]`, `netWorth[i]`, etc. Look a month up by finding
 * it in `labels` — never by arithmetic, because long forecasts (> 120 months)
 * include only the first 36 months plus each year-end, so positions are NOT a
 * linear function of the calendar month.
 * All values are integers in INR (rounded to the nearest rupee).
 */
export interface ContextPackSeries {
  startMonth: string;   // "YYYY-MM" — labels[0]
  months: number;       // total entries (= length of each array)
  labels: string[];     // "YYYY-MM" for each entry; the index key for every array below
  cash: number[];       // end-of-month cash balance
  netWorth: number[];
  investments: number[]; // investment corpus (all accounts combined)
  fd: number[];          // FD book value
  rd: number[];          // RD book value
}

export interface ContextPackAccount {
  name: string;
  currentValue: number;
  xirrPct: number | null;
  totalContributions: number;
  addedInScenario: boolean;
}

export interface ContextPackInstrument {
  kind: 'FD' | 'RD';
  name: string;
  principalOrContribution: number;
  ratePct: number;
  startMonth: string;
  maturityMonth: string;
  maturityValue: number;
}

export interface ContextPack {
  meta: ContextPackMeta;
  headline: ContextPackHeadline;
  series: ContextPackSeries;
  accounts: ContextPackAccount[];
  instruments: ContextPackInstrument[];
  scenarioChanges: string[];
  focusWindow?: { from: string; to: string };
}
