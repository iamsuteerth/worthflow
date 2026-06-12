import {
  Button,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";

import { useState } from "react";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import MonthSelect
  from "../common/MonthSelect";

import type {
  MonthKey,
} from "../../types/simulation";

import {
  generateMonths,
} from "../../engine/dateUtils";

export default function AddInvestmentOverrideForm() {
  const config =
    usePlannerStore(
      (state) =>
        state.config
    );

  const addInvestmentOverride =
    usePlannerStore(
      (state) =>
        state.addTransientInvestmentOverride
    );

  const runtimeEvents =
    usePlannerStore(
      (state) =>
        state.overrides.runtimeEvents
    );

  const months =
    generateMonths(
      config.forecast.startMonth,
      config.forecast.totalMonths
    );

  const forecastStart =
    months[0];

  const forecastEnd =
    months[
    months.length - 1
    ];

  const [
    startMonth,
    setStartMonth,
  ] = useState<
    MonthKey | null
  >(forecastStart);

  const [
    endMonth,
    setEndMonth,
  ] = useState<
    MonthKey | null
  >(forecastStart);

  const [
    amount,
    setAmount,
  ] = useState(0);

  const validRange =
    !!startMonth &&
    !!endMonth &&
    startMonth <= endMonth;

  const investmentOverrides =
    (runtimeEvents ?? []).filter(
      (event) =>
        event.type ===
        "INVESTMENT_OVERRIDE"
    );

  const overlap =
    !!startMonth &&
    !!endMonth &&
    investmentOverrides.some(
      (event) =>
        !(
          endMonth <
          event.startMonth ||
          startMonth >
          event.endMonth
        )
    );

  return (
    <Stack>
      <Text
        size="sm"
        c="dimmed"
      >
        Override the monthly
        investment amount for
        a date range. Use ₹0
        to temporarily pause
        investing.
      </Text>

      <MonthSelect
        label="Start Month"
        value={startMonth}
        minMonth={forecastStart}
        maxMonth={forecastEnd}
        onChange={(value) =>
          setStartMonth(
            value as MonthKey | null
          )
        }
      />

      <MonthSelect
        label="End Month"
        value={endMonth}
        minMonth={forecastStart}
        maxMonth={forecastEnd}
        onChange={(value) =>
          setEndMonth(
            value as MonthKey | null
          )
        }
      />

      <NumberInput
        label="Monthly Investment"
        value={amount}
        min={0}
        thousandSeparator=","
        onChange={(
          value
        ) =>
          setAmount(
            Number(value)
          )
        }
      />

      {!validRange && (
        <Text
          size="xs"
          c="red"
        >
          End month must be after
          start month.
        </Text>
      )}

      {overlap && (
        <Text
          size="xs"
          c="red"
        >
          This range overlaps an
          existing investment
          override.
        </Text>
      )}

      <Button
        disabled={
          !validRange ||
          overlap ||
          amount < 0
        }
        onClick={() => {
          if (
            !startMonth ||
            !endMonth
          ) {
            return;
          }

          addInvestmentOverride(
            startMonth,
            endMonth,
            amount
          );

          setAmount(0);
        }}
      >
        Add Investment Override
      </Button>
    </Stack>
  );
}