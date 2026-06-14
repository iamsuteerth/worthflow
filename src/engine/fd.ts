// src/engine/fd.ts
import type { FixedDeposit } from "@/types/instrument";
import type { MonthKey } from "@/types/simulation";
import { addMonths } from "@/engine/dateUtils";

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

export function getFdValue(
  fd: FixedDeposit,
  month: MonthKey
): number {
  if (!isFdActive(fd, month)) {
    return 0;
  }

  const startDate =
    new Date(`${fd.startMonth}-01`);

  const currentDate =
    new Date(`${month}-01`);

  const elapsedMonths =
    (currentDate.getFullYear() -
      startDate.getFullYear()) *
      12 +
    (currentDate.getMonth() -
      startDate.getMonth());

  const years =
    elapsedMonths / 12;

  return (
    fd.principal *
    Math.pow(
      1 + fd.rate / 100,
      years
    )
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

  const years =
    elapsedMonths / 12;

  return {
    ...position,

    currentValue:
      position.principal *
      Math.pow(
        1 + position.rate / 100,
        years
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

  const years =
    elapsedMonths / 12;

  return {
    id: fd.id,

    name: fd.name,

    principal: fd.principal,

    currentValue:
      fd.principal *
      Math.pow(
        1 + fd.rate / 100,
        years
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