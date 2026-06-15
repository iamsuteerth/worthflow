// src/components/scenario/AddInvestmentAccountForm.tsx
import { Button, Grid, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentAccountForm() {
  const config = usePlannerStore((s) => s.config);
  const createInvestmentAccount = usePlannerStore((s) => s.createInvestmentAccount);
  const setDashboardTab = useUiStore((s) => s.setDashboardTab);
  const setHighlightAccountId = useUiStore((s) => s.setHighlightAccountId);

  const forecastStart = config.forecast.startMonth;

  const [name, setName] = useState("");
  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [defaultMonthlyContribution, setDefaultMonthlyContribution] = useState(0);
  const [defaultAnnualReturn, setDefaultAnnualReturn] = useState(0);

  const canAdd =
    name.trim().length > 0 &&
    !!startMonth &&
    openingBalance >= 0 &&
    defaultMonthlyContribution >= 0 &&
    (openingBalance > 0 || defaultMonthlyContribution > 0);

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Create a new investment account. Every account behaves identically - growth, contributions, deposits and withdrawals.
      </Text>

      <TextInput
        maxLength={50}
        label="Account Name"
        placeholder="e.g. Nifty 50, Emergency Fund"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <Grid gap="sm">
        <Grid.Col span={6}>
          <MonthSelect
            label="Start Month"
            value={startMonth}
            minMonth={forecastStart}
            onChange={(v) => setStartMonth(v as MonthKey | null)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Opening Balance"
            value={openingBalance}
            min={0}
            thousandSeparator=","
            prefix="₹"
            onChange={(v) => setOpeningBalance(Number(v))}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Default Monthly Contribution"
            value={defaultMonthlyContribution}
            min={0}
            thousandSeparator=","
            prefix="₹"
            onChange={(v) => setDefaultMonthlyContribution(Number(v))}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Default Annual Return"
            value={defaultAnnualReturn}
            min={-99.99}
            max={1000}
            decimalScale={2}
            suffix="%"
            onChange={(v) => setDefaultAnnualReturn(Number(v))}
          />
        </Grid.Col>
      </Grid>

      <Button
        leftSection={<IconPlus size={16} />}
        color="grape"
        disabled={!canAdd}
        onClick={() => {
          if (!startMonth) return;
          const newId = createInvestmentAccount({
            name: name.trim(),
            startMonth,
            openingBalance,
            defaultAnnualReturn,
            defaultMonthlyContribution,
          });
          if (newId) {
            notifications.show({
              color: "green",
              title: "Account created",
              message: `${name.trim()} was added to your investment accounts`,
            });
            setHighlightAccountId(newId);
            setDashboardTab("accounts");
          }
          setName("");
          setStartMonth(forecastStart);
          setOpeningBalance(0);
          setDefaultMonthlyContribution(0);
          setDefaultAnnualReturn(0);
        }}
      >
        Add Account
      </Button>
    </Stack>
  );
}
