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
 *
 * The balance columns (cash/netWorth/investments/fd/rd) are end-of-month stocks.
 * The flow columns are that month's cashflow, and EVERY month fully reconciles:
 *   cash[i] − cash[i−1] =
 *     income − flatExp − oneOff − recurring − creditCard − investing
 *     + proceeds + instrumentFlow
 * The expense and `investing` columns are positive magnitudes of cash OUT;
 * `proceeds` and `instrumentFlow` are SIGNED (+ = cash in, − = cash out). So a
 * month's spending is flatExp + oneOff + recurring + creditCard, its scheduled
 * investing is `investing`, a runtime deposit/withdrawal is `proceeds`, and an
 * FD/RD purchase, contribution or maturity is `instrumentFlow`. Name the driver
 * behind a flow via `planItems`.
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
  income: number[];      // that month's income
  flatExp: number[];     // baseline (default) monthly spend
  oneOff: number[];      // one-off expenses charged that month
  recurring: number[];   // recurring-expense charges that month
  creditCard: number[];  // credit-card bills paid that month
  investing: number[];   // scheduled contributions + funded openings into investment accounts that month
  proceeds: number[];    // signed runtime deposit/withdrawal cash: + withdrawal in, − deposit out
  instrumentFlow: number[]; // signed FD/RD cash: + maturity in, − purchase/contribution out
}

/**
 * A named driver behind the numbers — the plan's expense/income line items, base
 * plan and active scenario alike (they are merged into the effective config before
 * the pack is built). Lets the model attribute a month's spending to a NAME
 * ("September is high because of the 'Car down payment' one-off") instead of only
 * quoting a component figure. Point events (`oneOff`, `card`, `bonus`, `salary`)
 * carry `month`; a `recurring` item carries `from`/`to`/`freq`. Money is integer INR.
 * This is for naming/attribution; `scenarioChanges` remains the numbered, editable
 * list of what the active scenario changed.
 */
export interface ContextPackPlanItem {
  kind: 'oneOff' | 'card' | 'recurring' | 'bonus' | 'salary';
  name: string;
  amount: number;
  month?: string;                    // point events + salary effective month
  from?: string;                     // recurring start
  to?: string;                       // recurring end
  freq?: 'MONTHLY' | 'ANNUAL';       // recurring frequency
}

export interface ContextPackAccount {
  name: string;
  currentValue: number;
  xirrPct: number | null;
  // Cost basis behind `xirrPct`: the opening balance + every monthly contribution
  // + every runtime deposit. NOT just recurring contributions — it includes the
  // seed lump and one-off deposits, because that is the capital the XIRR is on.
  investedCapital: number;
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
 * (NOT the down-sampled `series`). `highestExpenseMonth` is pure spending (flat +
 * credit-card + one-off + recurring); `highestOutflowMonth` is total cash OUT —
 * that spending PLUS scheduled investing, runtime deposits, and FD/RD purchases.
 * Money is integer INR.
 */
export interface ContextPackAggregates {
  avgMonthlyExpense: number;
  highestExpenseMonth: { month: string; amount: number };   // biggest spending month
  highestOutflowMonth: { month: string; amount: number };   // biggest total cash OUT: spending + investing + deposits + FD/RD purchases
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
  planItems: ContextPackPlanItem[];
  scenarioChanges: string[];
  scenarioEffect?: ContextPackScenarioEffect;
  focusWindow?: { from: string; to: string };
}
