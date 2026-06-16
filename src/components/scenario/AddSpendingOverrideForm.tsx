// src/components/scenario/AddSpendingOverrideForm.tsx
import { Alert, Button, Grid, NumberInput, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconAdjustments } from "@tabler/icons-react";
import { useState } from "react";
import { generateMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import type { RuntimeSpendingOverride } from "@/types/runtimeEvent";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddSpendingOverrideForm() {
  const config = usePlannerStore((s) => s.config);
  const overrides = usePlannerStore((s) => s.overrides);
  const addSpendingOverride = usePlannerStore((s) => s.addTransientSpendingOverride);

  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastStart = months[0];
  const forecastEnd = months[months.length - 1];

  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [endMonth, setEndMonth] = useState<MonthKey | null>(forecastEnd);
  const [amount, setAmount] = useState(config.expenses.defaultMonthly);

  const validRange = !!startMonth && !!endMonth && startMonth <= endMonth;

  const existingOverrides = (overrides.runtimeEvents ?? []).filter(
    (e): e is RuntimeSpendingOverride => e.type === "SPENDING_OVERRIDE"
  );
  const hasOverlap =
    validRange &&
    existingOverrides.some(
      (e) => !(endMonth! < e.startMonth || startMonth! > e.endMonth)
    );

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Replaces the baseline monthly spend (₹{config.expenses.defaultMonthly.toLocaleString("en-IN")}/mo) for a date range.
        Additive items — recurring, credit card, and one-off expenses — still stack on top of the override amount.
      </Text>

      <NumberInput
        label="Override Amount"
        description={`Baseline is ₹${config.expenses.defaultMonthly.toLocaleString("en-IN")}/mo`}
        value={amount}
        min={0}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => setAmount(Number(v))}
      />

      <Grid gap="sm">
        <Grid.Col span={6}>
          <MonthSelect
            label="Start Month"
            value={startMonth}
            minMonth={forecastStart}
            maxMonth={forecastEnd}
            onChange={(v) => setStartMonth(v as MonthKey | null)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <MonthSelect
            label="End Month"
            value={endMonth}
            minMonth={startMonth ?? forecastStart}
            maxMonth={forecastEnd}
            onChange={(v) => setEndMonth(v as MonthKey | null)}
          />
        </Grid.Col>
      </Grid>

      {!validRange && startMonth && endMonth && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          End month must be on or after start month.
        </Alert>
      )}

      {hasOverlap && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          This range overlaps an existing spending override. Ranges cannot overlap.
        </Alert>
      )}

      {validRange && !hasOverlap && startMonth && endMonth && (
        <Text size="xs" c="dimmed">
          Baseline spend replaced for{" "}
          <Text span fw={600}>{formatMonth(startMonth)} → {formatMonth(endMonth)}</Text>
          {" "}with <Text span fw={600} c="pink">₹{amount.toLocaleString("en-IN")}/mo</Text>.
        </Text>
      )}

      <Button
        leftSection={<IconAdjustments size={16} />}
        color="pink"
        disabled={!validRange || hasOverlap || amount < 0}
        onClick={() => {
          if (!startMonth || !endMonth) return;
          addSpendingOverride(startMonth, endMonth, amount);
        }}
      >
        Set Spending Override
      </Button>
    </Stack>
  );
}
