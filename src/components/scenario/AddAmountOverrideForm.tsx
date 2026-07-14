import type { RuntimeAccountAmountOverride } from "@/types/runtimeEvent";
import type { MonthKey } from "@/types/simulation";

import { Alert, Button, Grid, NumberInput, Select, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconChartLine } from "@tabler/icons-react";
import { useState } from "react";

import MonthSelect from "@/components/common/MonthSelect";
import { generateMonths } from "@/engine/dateUtils";
import { usePlannerStore } from "@/store/plannerStore";

export default function AddAmountOverrideForm() {
  const config = usePlannerStore((state) => state.config);
  const addAmountOverride = usePlannerStore((state) => state.addTransientAccountAmountOverride);
  const runtimeEvents = usePlannerStore((state) => state.overrides.runtimeEvents);

  const months = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);
  const forecastStart = months[0];
  const forecastEnd = months[months.length - 1];

  const accounts = config.investments.accounts;
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const account = accounts.find((a) => a.id === accountId) ?? null;

  const minMonth = account ? (account.startMonth > forecastStart ? account.startMonth : forecastStart) : forecastStart;

  const [startMonth, setStartMonth] = useState<MonthKey | null>(minMonth);
  const [endMonth, setEndMonth] = useState<MonthKey | null>(minMonth);
  const [amount, setAmount] = useState(0);

  const validRange = !!startMonth && !!endMonth && startMonth <= endMonth;
  const validStart = !!startMonth && !!account && startMonth >= account.startMonth;

  const existing = (runtimeEvents ?? []).filter(
    (event): event is RuntimeAccountAmountOverride =>
      event.type === "ACCOUNT_AMOUNT_OVERRIDE" && event.accountId === accountId
  );

  const overlap =
    !!startMonth &&
    !!endMonth &&
    existing.some((event) => !(endMonth < event.startMonth || startMonth > event.endMonth));

  if (accounts.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No investment accounts exist yet. Create an account first.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Temporarily replace an account&apos;s monthly contribution for a date range. Use ₹0 to pause contributions.
      </Text>

      <Select
        label="Account"
        placeholder="Select account"
        data={accountOptions}
        value={accountId}
        onChange={(value) => {
          setAccountId(value);
          const acc = accounts.find((a) => a.id === value);
          const min = acc ? (acc.startMonth > forecastStart ? acc.startMonth : forecastStart) : forecastStart;
          setStartMonth(min);
          setEndMonth(min);
        }}
      />

      <Grid gap="sm">
        <Grid.Col span={6}>
          <MonthSelect
            label="Start Month"
            value={startMonth}
            minMonth={minMonth}
            maxMonth={forecastEnd}
            onChange={(value) => setStartMonth(value as MonthKey | null)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <MonthSelect
            label="End Month"
            value={endMonth}
            minMonth={minMonth}
            maxMonth={forecastEnd}
            onChange={(value) => setEndMonth(value as MonthKey | null)}
          />
        </Grid.Col>
      </Grid>

      <NumberInput
        label="Monthly Contribution"
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
          This account already has an amount override for that range.
        </Alert>
      )}

      <Button
        leftSection={<IconChartLine size={16} />}
        color="violet"
        disabled={!accountId || !validRange || !validStart || overlap || amount < 0}
        onClick={() => {
          if (!accountId || !startMonth || !endMonth) return;
          addAmountOverride(accountId, startMonth, endMonth, amount);
          setAmount(0);
        }}
      >
        Add Amount Override
      </Button>
    </Stack>
  );
}
