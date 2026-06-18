import { Button, NumberInput, Select, Stack, Text } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";
import { money } from "@/format/money";
import { useState } from "react";
import { formatMonth } from "@/engine/monthFormatting";
import { getAvailableCash, usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentDepositForm() {
  const addDeposit = usePlannerStore((s) => s.addTransientInvestmentDeposit);
  const config = usePlannerStore((s) => s.config);
  const overrides = usePlannerStore((s) => s.overrides);

  const forecastStart = config.forecast.startMonth;
  const accounts = config.investments.accounts;
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const account = accounts.find((a) => a.id === accountId) ?? null;

  const minMonth = account ? (account.startMonth > forecastStart ? account.startMonth : forecastStart) : forecastStart;

  const [month, setMonth] = useState<MonthKey | null>(minMonth);
  const [amount, setAmount] = useState(0);

  const availableCash = month ? getAvailableCash(config, overrides, month) : 0;

  const validMonth = !!month && !!account && month >= account.startMonth;

  if (accounts.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No investment accounts exist yet. Create an account first.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Select
        label="Target Account"
        placeholder="Select account"
        data={accountOptions}
        value={accountId}
        onChange={(value) => {
          setAccountId(value);
          const acc = accounts.find((a) => a.id === value);
          const min = acc ? (acc.startMonth > forecastStart ? acc.startMonth : forecastStart) : forecastStart;
          setMonth(min);
        }}
      />

      <MonthSelect
        label="Month"
        value={month}
        minMonth={minMonth}
        onChange={(v) => setMonth(v as MonthKey | null)}
      />

      <NumberInput
        label="Deposit Amount"
        value={amount}
        min={0}
        max={availableCash}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => setAmount(Number(v))}
      />

      <Text size="xs" c="dimmed">
        Available cash{month ? ` at ${formatMonth(month)}` : ""}:{" "}
        <Text span fw={600} c={amount > availableCash ? "red" : "teal"} style={{ fontVariantNumeric: "tabular-nums" }}>
          {money(availableCash)}
        </Text>
      </Text>

      <Button
        leftSection={<IconArrowDown size={16} />}
        color="brand"
        disabled={!accountId || !validMonth || amount <= 0 || amount > availableCash}
        onClick={() => {
          if (!accountId || !month) return;
          addDeposit(accountId, month, amount);
          setAmount(0);
        }}
      >
        Add Deposit
      </Button>
    </Stack>
  );
}
