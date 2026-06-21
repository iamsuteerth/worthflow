import type { FixedDeposit } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";
import { addMonths } from "@/engine/dateUtils";

// Indian fixed deposits compound quarterly (the bank convention): the rate is
// divided into four quarterly periods (rate/400) and applied once per elapsed
// quarter (elapsedMonths / 3). This mirrors the RD convention in rdMath.ts so
// both instruments value consistently. Accrual is elapsed-based and continuous
// in months, so a mid-quarter valuation grows proportionally.
export function fdValueAfterMonths(
  principal: number,
  rate: number,
  elapsedMonths: number
): number {
  return principal * Math.pow(1 + rate / 400, elapsedMonths / 3);
}

export interface FdPosition {
  id: string;

  name: string;

  principal: number;

  currentValue: number;

  rate: number;

  startMonth: MonthKey;

  maturityMonth: MonthKey;

  active: boolean;
}

export function isFdActive(
  fd: FixedDeposit,
  month: MonthKey
): boolean {
  const maturityMonth =
    addMonths(
      fd.startMonth,
      fd.durationMonths
    );

  return (
    month >= fd.startMonth &&
    month < maturityMonth
  );
}

export function createFdPosition(
  fd: FixedDeposit
): FdPosition {
  return {
    id: fd.id,

    name: fd.name,

    principal: fd.principal,

    currentValue: fd.principal,

    rate: fd.rate,

    startMonth: fd.startMonth,

    maturityMonth: addMonths(
      fd.startMonth,
      fd.durationMonths
    ),

    active: true,
  };
}

export function updateFdPosition(
  position: FdPosition,
  month: MonthKey
): FdPosition {
  const elapsedMonths =
    (new Date(`${month}-01`).getFullYear() -
      new Date(
        `${position.startMonth}-01`
      ).getFullYear()) *
      12 +
    (new Date(`${month}-01`).getMonth() -
      new Date(
        `${position.startMonth}-01`
      ).getMonth());

  return {
    ...position,

    currentValue: fdValueAfterMonths(
      position.principal,
      position.rate,
      elapsedMonths
    ),
  };
}

export function getElapsedMonths(
  startMonth: MonthKey,
  month: MonthKey
): number {
  const start =
    new Date(`${startMonth}-01`);

  const current =
    new Date(`${month}-01`);

  return (
    (current.getFullYear() -
      start.getFullYear()) *
      12 +
    (
      current.getMonth() -
      start.getMonth()
    )
  );
}

export function createHistoricalFdPosition(
  fd: FixedDeposit,
  forecastStart: MonthKey
): FdPosition {
  const elapsedMonths =
    getElapsedMonths(
      fd.startMonth,
      forecastStart
    );

  return {
    id: fd.id,

    name: fd.name,

    principal: fd.principal,

    currentValue: fdValueAfterMonths(
      fd.principal,
      fd.rate,
      elapsedMonths
    ),

    rate: fd.rate,

    startMonth:
      fd.startMonth,

    maturityMonth:
      addMonths(
        fd.startMonth,
        fd.durationMonths
      ),

    active: true,
  };
}