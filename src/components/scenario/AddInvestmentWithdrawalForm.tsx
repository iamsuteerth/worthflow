import type { MonthKey } from "@/types/simulation";

import { Button, NumberInput, Select, Stack, Text } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { money } from "@/format/money";
import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { usePlannerStore } from "@/store/plannerStore";
import MonthSelect from "@/components/common/MonthSelect";
import { forecastEndMonth } from "@/engine/dateUtils";

export default function AddInvestmentWithdrawalForm() {
  const result = useSimulation();
  const addWithdrawal = usePlannerStore((s) => s.addTransientInvestmentWithdrawal);
  const config = usePlannerStore((s) => s.config);

  const forecastStart = config.forecast.startMonth;
  const forecastEnd = forecastEndMonth(config.forecast.startMonth, config.forecast.totalMonths);
  const accounts = config.investments.accounts;

  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const account = accounts.find((a) => a.id === accountId) ?? null;

  const minMonth = account ? (account.startMonth > forecastStart ? account.startMonth : forecastStart) : forecastStart;

  const [month, setMonth] = useState<MonthKey | null>(minMonth);
  const [amount, setAmount] = useState(0);

  const row = month ? result.rows.find((r) => r.month === month) : null;

  const maxWithdrawal = (() => {
    if (!row || !accountId) return 0;
    const snapshot = row.assets.accountSnapshots.find((s) => s.accountId === accountId);
    return Math.max(0, snapshot?.value ?? 0);
  })();

  const accountOptions = accounts.map((a) => {
    const snap = row?.assets.accountSnapshots.find((s) => s.accountId === a.id);
    return {
      value: a.id,
      label: snap ? `${a.name} (${money(snap.value)})` : a.name,
    };
  });

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
        label="Source Account"
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
        maxMonth={forecastEnd}
        onChange={(v) => setMonth(v as MonthKey | null)}
      />

      <NumberInput
        label="Withdrawal Amount"
        value={amount}
        min={0}
        max={maxWithdrawal}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => setAmount(Number(v))}
      />

      <Text size="xs" c="dimmed">
        Account balance:{" "}
        <Text span fw={600} c="violet" style={{ fontVariantNumeric: "tabular-nums" }}>
          {money(maxWithdrawal)}
        </Text>
      </Text>

      <Button
        leftSection={<IconArrowUp size={16} />}
        color="teal"
        disabled={!accountId || !validMonth || amount <= 0 || amount > maxWithdrawal}
        onClick={() => {
          if (!accountId || !month) return;
          addWithdrawal(accountId, month, amount);
          setAmount(0);
        }}
      >
        Add Withdrawal
      </Button>
    </Stack>
  );
}
