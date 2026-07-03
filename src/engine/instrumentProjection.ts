import type { RdPosition } from "@/engine/rd";
import type { Instrument, FixedDeposit } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";

import { addMonths } from "@/engine/dateUtils";
import { calculateRdValue } from "@/engine/rdMath";
import { createFdPosition, updateFdPosition } from "@/engine/fd";

export interface InstrumentProjection {
  principal: number;
  maturityValue: number;
  interest: number;
}

const ANCHOR = "2000-01" as MonthKey;

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

export function rdMaturityValue(monthlyContribution: number, rate: number, durationMonths: number): number {
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

// Single source of truth for instrument projections shown in the UI.
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
