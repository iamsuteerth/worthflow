import { Button, Grid, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { getAvailableCash, usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { money } from "@/format/money";
import { formatMonth } from "@/engine/monthFormatting";
import { forecastEndMonth } from "@/engine/dateUtils";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

const labelStyle = {
  label: {
    minHeight: 42,
    display: "flex",
    alignItems: "flex-end",
  },
};
export default function AddInvestmentAccountForm() {
  const config = usePlannerStore((s) => s.config);
  const overrides = usePlannerStore((s) => s.overrides);
  const createInvestmentAccount = usePlannerStore((s) => s.createInvestmentAccount);
  const setDashboardTab = useUiStore((s) => s.setDashboardTab);
  const setHighlightAccountId = useUiStore((s) => s.setHighlightAccountId);

  const forecastStart = config.forecast.startMonth;
  const forecastEnd = forecastEndMonth(config.forecast.startMonth, config.forecast.totalMonths);

  const [name, setName] = useState("");
  const [startMonth, setStartMonth] = useState<MonthKey | null>(forecastStart);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [defaultMonthlyContribution, setDefaultMonthlyContribution] = useState(0);
  const [defaultAnnualReturn, setDefaultAnnualReturn] = useState(0);

  // A future-dated account funds its opening balance from cash at its start month,
  // so (like deposits/FDs) it can't exceed the cash available then. An account
  // starting at the forecast start represents wealth already held — no cap.
  const isFutureDated = !!startMonth && startMonth > forecastStart;
  const availableCash =
    startMonth && isFutureDated ? getAvailableCash(config, overrides, startMonth) : null;
  const exceedsCash = availableCash !== null && openingBalance > availableCash;

  const canAdd =
    name.trim().length > 0 &&
    !!startMonth &&
    openingBalance >= 0 &&
    defaultMonthlyContribution >= 0 &&
    (openingBalance > 0 || defaultMonthlyContribution > 0) &&
    !exceedsCash;

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
            maxMonth={forecastEnd}
            onChange={(v) => setStartMonth(v as MonthKey | null)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Opening Balance"
            value={openingBalance}
            min={0}
            max={availableCash ?? undefined}
            thousandSeparator=","
            prefix="₹"
            onChange={(v) => setOpeningBalance(Number(v))}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Default Monthly Contribution"
            styles={labelStyle}
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
            styles={labelStyle}
            value={defaultAnnualReturn}
            min={-99.99}
            max={1000}
            decimalScale={2}
            suffix="%"
            onChange={(v) => setDefaultAnnualReturn(Number(v))}
          />
        </Grid.Col>
      </Grid>

      {isFutureDated && availableCash !== null && startMonth && (
        <Text size="xs" c="dimmed">
          Opening balance is funded from cash at {formatMonth(startMonth)}. Available:{" "}
          <Text span fw={600} c={exceedsCash ? "red" : "teal"} style={{ fontVariantNumeric: "tabular-nums" }}>
            {money(availableCash)}
          </Text>
        </Text>
      )}

      <Button
        leftSection={<IconPlus size={16} />}
        color="violet"
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
              color: "teal",
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
