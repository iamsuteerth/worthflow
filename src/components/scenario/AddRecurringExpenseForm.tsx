// src/components/scenario/AddRecurringExpenseForm.tsx
import { Alert, Button, Grid, NumberInput, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconRepeat } from "@tabler/icons-react";
import { useState } from "react";
import { generateMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { getMaxAnnualYears, deriveAnnualEndMonth } from "@/engine/annualExpense";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddRecurringExpenseForm() {
  const config = usePlannerStore((state) => state.config);
  const addRecurringExpense = usePlannerStore(
    (state) => state.addTransientRecurringExpense
  );

  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastStart = months[0];
  const forecastEnd = months[months.length - 1];

  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [endMonth, setEndMonth] = useState<MonthKey | null>(forecastEnd);
  const [years, setYears] = useState(1);
  const [frequency, setFrequency] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  const maxYears = startMonth
    ? getMaxAnnualYears(config.forecast.startMonth, config.forecast.totalMonths, startMonth)
    : 0;

  const annualEndMonth = startMonth ? deriveAnnualEndMonth(startMonth, years) : null;

  const validRange =
    frequency === "ANNUAL"
      ? !!startMonth && maxYears >= 1 && years >= 1 && years <= maxYears
      : !!startMonth && !!endMonth && startMonth <= endMonth;

  const durationMonths =
    startMonth && endMonth
      ? (() => {
          const [sy, sm] = startMonth.split("-").map(Number);
          const [ey, em] = endMonth.split("-").map(Number);
          return (ey - sy) * 12 + (em - sm) + 1;
        })()
      : 0;

  const occurrences = frequency === "ANNUAL" ? years : durationMonths;

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Model subscriptions, rent, insurance, or any obligation that recurs monthly over a date range.
      </Text>

      <TextInput
        maxLength={50}
        label="Name"
        placeholder="e.g. Netflix, Rent, School Fees"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <NumberInput
        label="Monthly Amount"
        value={amount}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      <SegmentedControl
        value={frequency}
        onChange={(value) => setFrequency(value as "MONTHLY" | "ANNUAL")}
        data={[
          { label: "Monthly", value: "MONTHLY" },
          { label: "Annual", value: "ANNUAL" },
        ]}
      />

      {frequency === "ANNUAL" ? (
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
            <NumberInput
              label="Number of Years"
              value={years}
              min={1}
              max={Math.max(maxYears, 1)}
              onChange={(value) => setYears(Number(value))}
            />
          </Grid.Col>
        </Grid>
      ) : (
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
      )}

      {frequency === "ANNUAL" && maxYears < 1 && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          This start month leaves less than a year before the end of the forecast.
        </Alert>
      )}

      {frequency === "ANNUAL" && maxYears >= 1 && years > maxYears && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          Number of years exceeds the forecast window. Maximum is {maxYears}.
        </Alert>
      )}

      {frequency === "MONTHLY" && !validRange && startMonth && endMonth && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          End month must be on or after start month.
        </Alert>
      )}

      {validRange && occurrences > 0 && amount > 0 && (
        <Text size="xs" c="dimmed">
          {frequency === "ANNUAL"
            ? `Charged once a year, ${occurrences} time${occurrences !== 1 ? "s" : ""}${annualEndMonth ? ` (through ${formatMonth(annualEndMonth)})` : ""}, total: `
            : `Total over ${occurrences} month${occurrences !== 1 ? "s" : ""}: `}
          <Text span fw={600} c="red">
            ₹{(amount * occurrences).toLocaleString()}
          </Text>
        </Text>
      )}

      <Button
        leftSection={<IconRepeat size={16} />}
        color="red"
        disabled={!name.trim() || amount <= 0 || !validRange}
        onClick={() => {
          if (!startMonth) return;
          const resolvedEndMonth = frequency === "ANNUAL" ? deriveAnnualEndMonth(startMonth, years) : endMonth;
          if (!resolvedEndMonth) return;
          addRecurringExpense(name.trim(), amount, startMonth, resolvedEndMonth, frequency);
          setName("");
          setAmount(0);
        }}
      >
        Add Recurring Expense
      </Button>
    </Stack>
  );
}
