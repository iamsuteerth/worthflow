import { Alert, Button, Grid, NumberInput, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconChartLine } from "@tabler/icons-react";
import { useState } from "react";
import { generateMonths } from "@/engine/dateUtils";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentOverrideForm() {
  const config = usePlannerStore((state) => state.config);
  const addInvestmentOverride = usePlannerStore(
    (state) => state.addTransientInvestmentOverride
  );
  const runtimeEvents = usePlannerStore((state) => state.overrides.runtimeEvents);

  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastStart = months[0];
  const forecastEnd = months[months.length - 1];

  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [endMonth, setEndMonth] = useState<MonthKey | null>(forecastStart);
  const [amount, setAmount] = useState(0);

  const validRange = !!startMonth && !!endMonth && startMonth <= endMonth;

  const investmentOverrides = (runtimeEvents ?? []).filter(
    (event) => event.type === "INVESTMENT_OVERRIDE"
  );

  const overlap =
    !!startMonth &&
    !!endMonth &&
    investmentOverrides.some(
      (event) => !(endMonth < event.startMonth || startMonth > event.endMonth)
    );

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Override the monthly investment amount for a date range. Use ₹0 to temporarily pause investing.
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
        label="Monthly Investment"
        value={amount}
        min={0}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      {!validRange && startMonth && endMonth && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          End month must be on or after start month.
        </Alert>
      )}

      {overlap && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light" p="xs">
          This range overlaps an existing investment override.
        </Alert>
      )}

      <Button
        leftSection={<IconChartLine size={16} />}
        color="violet"
        disabled={!validRange || overlap || amount < 0}
        onClick={() => {
          if (!startMonth || !endMonth) return;
          addInvestmentOverride(startMonth, endMonth, amount);
          setAmount(0);
        }}
      >
        Add Investment Override
      </Button>
    </Stack>
  );
}