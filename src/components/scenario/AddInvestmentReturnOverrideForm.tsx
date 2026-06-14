import { Alert, Button, Grid, NumberInput, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconTrendingUp } from "@tabler/icons-react";
import { useState } from "react";
import { generateMonths } from "@/engine/dateUtils";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentReturnOverrideForm() {
  const config = usePlannerStore((state) => state.config);
  const addReturnOverride = usePlannerStore(
    (state) => state.addTransientInvestmentReturnOverride
  );
  const runtimeEvents = usePlannerStore((state) => state.overrides.runtimeEvents);

  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastStart = months[0];
  const forecastEnd = months[months.length - 1];

  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [endMonth, setEndMonth] = useState<MonthKey | null>(forecastStart);
  const [annualReturn, setAnnualReturn] = useState(0);

  const validRange = !!startMonth && !!endMonth && startMonth <= endMonth;

  const existing = (runtimeEvents ?? []).filter(
    (event) => event.type === "INVESTMENT_RETURN_OVERRIDE"
  );

  const overlap =
    !!startMonth &&
    !!endMonth &&
    existing.some(
      (event) => !(endMonth < event.startMonth || startMonth > event.endMonth)
    );

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Override portfolio growth assumptions for a date range.
      </Text>

      <Grid gap="sm">
        <Grid.Col span={6}>
          <MonthSelect
            label="Start Month"
            value={startMonth}
            minMonth={forecastStart}
            maxMonth={forecastEnd}
            onChange={(value) => setStartMonth(value as MonthKey | null)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <MonthSelect
            label="End Month"
            value={endMonth}
            minMonth={forecastStart}
            maxMonth={forecastEnd}
            onChange={(value) => setEndMonth(value as MonthKey | null)}
          />
        </Grid.Col>
      </Grid>

      <NumberInput
        label="Annual Return"
        value={annualReturn}
        min={-99.99}
        max={100}
        decimalScale={2}
        suffix="%"
        onChange={(value) => setAnnualReturn(Number(value))}
      />

      {!validRange && startMonth && endMonth && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          End month must be on or after start month.
        </Alert>
      )}

      {overlap && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light" p="xs">
          This range overlaps an existing return override.
        </Alert>
      )}

      <Button
        leftSection={<IconTrendingUp size={16} />}
        color="indigo"
        disabled={!validRange || overlap || annualReturn < -99.99 || annualReturn > 100}
        onClick={() => {
          if (!startMonth || !endMonth) return;
          addReturnOverride(startMonth, endMonth, annualReturn);
          setAnnualReturn(0);
        }}
      >
        Add Return Override
      </Button>
    </Stack>
  );
}