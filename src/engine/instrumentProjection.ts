import { addMonths } from "@/engine/dateUtils";
import { calculateRdValue } from "@/engine/rdMath";
import { createFdPosition, updateFdPosition } from "@/engine/fd";
import type { RdPosition } from "@/engine/rd";
import type { Instrument, FixedDeposit } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";

export interface InstrumentProjection {
  principal: number;
  maturityValue: number;
  interest: number;
}

// A fixed anchor month — only the *elapsed duration* affects the engine
// valuation, never the absolute calendar month, so this is arbitrary.
const ANCHOR = "2000-01" as MonthKey;

/**
 * FD maturity value, computed via the engine's own `updateFdPosition` so the
 * displayed figure can never drift from the simulated payout.
 */
export function fdMaturityValue(
  principal: number,
  rate: number,
  durationMonths: number
): number {
  const fd: FixedDeposit = {
    id: "_proj",
    type: "FD",
    name: "_proj",
    principal,
    rate,
    startMonth: ANCHOR,
    durationMonths,
  };
  const position = createFdPosition(fd);
  return updateFdPosition(position, position.maturityMonth).currentValue;
}

/**
 * RD maturity value, computed via the engine's own `calculateRdValue` so the
 * displayed figure always matches what the simulation pays out.
 */
export function rdMaturityValue(
  monthlyContribution: number,
  rate: number,
  durationMonths: number
): number {
  const maturityMonth = addMonths(ANCHOR, durationMonths);
  const position: RdPosition = {
    id: "_proj",
    name: "_proj",
    monthlyContribution,
    rate,
    startMonth: ANCHOR,
    maturityMonth,
    durationMonths,
    totalContributed: 0,
    currentValue: 0,
    active: true,
  };
  return calculateRdValue(position, maturityMonth);
}

/**
 * Principal, maturity value, and interest for any instrument — the single
 * source of truth for instrument projections shown in the UI.
 */
export function projectInstrument(instrument: Instrument): InstrumentProjection {
  if (instrument.type === "FD") {
    const principal = instrument.principal;
    const maturityValue = fdMaturityValue(principal, instrument.rate, instrument.durationMonths);
    return { principal, maturityValue, interest: maturityValue - principal };
  }

  const principal = instrument.monthlyContribution * instrument.durationMonths;
  const maturityValue = rdMaturityValue(
    instrument.monthlyContribution,
    instrument.rate,
    instrument.durationMonths
  );
  return { principal, maturityValue, interest: maturityValue - principal };
}
