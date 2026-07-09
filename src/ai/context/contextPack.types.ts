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

/**
 * Pre-computed answers to the aggregate questions users actually ask, so the model
 * QUOTES them rather than computing (which is where a single-shot answer would
 * hallucinate). All figures come straight from the engine rows, full-resolution
 * (NOT the down-sampled `series`). Expense = flat + credit-card + one-off +
 * recurring spending (excludes investing/FD funding, which `highestOutflowMonth`
 * captures separately). Money is integer INR.
 */
export interface ContextPackAggregates {
  avgMonthlyExpense: number;
  highestExpenseMonth: { month: string; amount: number };   // biggest spending month
  highestOutflowMonth: { month: string; amount: number };   // biggest total cash outflow (incl. investing)
  biggestCashDrops: Array<{ month: string; drop: number }>; // top month-over-month cash decreases (the "dips")
  perYear: Array<{ year: string; income: number; expenses: number; endCash: number; endNetWorth: number }>;
}

/**
 * Aggregate effect of the active scenario, measured against the base plan. Present
 * ONLY when a scenario is active. Both sides come straight from the engine
 * (simulate) — the model must read these numbers verbatim, never compute the delta
 * itself. The base side is `simulate(baseConfig, {})`: a scenario-created what-if
 * account lives in `overrides.scenarioAccounts` (NOT baseConfig), so its effect appears
 * on the SCENARIO side only here (and is surfaced via `accounts[].addedInScenario`).
 * The deltas thus capture every override-layer change — runtime events (expenses,
 * deposits/withdrawals, FDs/RDs, overrides, opening-cash) plus what-if / removed accounts.
 */
export interface ContextPackScenarioEffect {
  baseFinalNetWorth: number;
  scenarioFinalNetWorth: number;
  baseLowestCash: number;
  scenarioLowestCash: number;
  baseLowestCashMonth: string;
  scenarioLowestCashMonth: string;
}

export interface ContextPack {
  meta: ContextPackMeta;
  headline: ContextPackHeadline;
  aggregates: ContextPackAggregates;
  series: ContextPackSeries;
  accounts: ContextPackAccount[];
  instruments: ContextPackInstrument[];
  scenarioChanges: string[];
  scenarioEffect?: ContextPackScenarioEffect;
  focusWindow?: { from: string; to: string };
}
