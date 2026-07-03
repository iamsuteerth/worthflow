import type { MonthKey } from "@/types/simulation";
import type { RuntimeAccountReturnOverride } from "@/types/runtimeEvent";

import { Alert, Button, Grid, NumberInput, Select, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconTrendingUp } from "@tabler/icons-react";
import { useState } from "react";
import { generateMonths } from "@/engine/dateUtils";
import { usePlannerStore } from "@/store/plannerStore";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentReturnOverrideForm() {
  const config = usePlannerStore((state) => state.config);
  const addReturnOverride = usePlannerStore((state) => state.addTransientAccountReturnOverride);
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
  const [annualReturn, setAnnualReturn] = useState(0);

  const validRange = !!startMonth && !!endMonth && startMonth <= endMonth;
  const validStart = !!startMonth && !!account && startMonth >= account.startMonth;

  const existing = (runtimeEvents ?? []).filter(
    (event): event is RuntimeAccountReturnOverride =>
      event.type === "ACCOUNT_RETURN_OVERRIDE" && event.accountId === accountId
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
        Override the annual return for a specific account over a date range.
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
        label="Annual Return"
        value={annualReturn}
        min={-99.99}
        max={1000}
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
          This account already has a return override for that range.
        </Alert>
      )}

      <Button
        leftSection={<IconTrendingUp size={16} />}
        color="brand"
        disabled={
          !accountId ||
          !validRange ||
          !validStart ||
          overlap ||
          annualReturn < -99.99 ||
          annualReturn > 1000
        }
        onClick={() => {
          if (!accountId || !startMonth || !endMonth) return;
          addReturnOverride(accountId, startMonth, endMonth, annualReturn);
          setAnnualReturn(0);
        }}
      >
        Add Return Override
      </Button>
    </Stack>
  );
}
