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

export interface ContextPackSeriesPoint {
  month: string;
  cash: number;
  netWorth: number;
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
  series: ContextPackSeriesPoint[];
  accounts: ContextPackAccount[];
  instruments: ContextPackInstrument[];
  scenarioChanges: string[];
  focusWindow?: { from: string; to: string };
}
