import {
  NumberInput,
  Text,
} from "@mantine/core";

import BuilderMonthSelect
  from "./BuilderMonthSelect";

import {
  useBuilderStore,
} from "../../store/builderStore";

import type {
  MonthKey,
} from "../../types/simulation";
import BuilderStepContainer from "./BuilderStepContainer";

export default function ForecastStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const setForecast =
    useBuilderStore(
      (store) =>
        store.setForecast
    );

  return (
    <BuilderStepContainer>
      <Text
        size="sm"
        c="dimmed"
      >
        Define how long the forecast should run.
      </Text>

      <BuilderMonthSelect
        label="Forecast Start Month"
        value={
          state.startMonth
        }
        onChange={(
          value: string | null
        ) => {
          if (!value) {
            return;
          }

          setForecast(
            value as MonthKey,
            state.totalMonths
          );
        }}
      />

      <NumberInput
        label="Forecast Horizon (Months)"
        description="Allowed range: 12 to 48 months"
        value={
          state.totalMonths
        }
        min={12}
        max={48}
        allowDecimal={false}
        clampBehavior="strict"
        onChange={(
          value
        ) =>
          setForecast(
            state.startMonth,
            Number(
              value
            )
          )
        }
      />
    </BuilderStepContainer >
  );
}