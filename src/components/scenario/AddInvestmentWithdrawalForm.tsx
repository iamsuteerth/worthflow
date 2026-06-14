// src/components/scenario/AddInvestmentWithdrawalForm.tsx
import { Button, NumberInput, Stack, Text } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { useState } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function AddInvestmentWithdrawalForm() {
  const result = useSimulation();
  const addWithdrawal = usePlannerStore((state) => state.addTransientInvestmentWithdrawal);
  const startMonth = usePlannerStore((state) => state.config.forecast.startMonth);

  const [month, setMonth] = useState<MonthKey | null>(startMonth);
  const [amount, setAmount] = useState(0);

  const maxWithdrawal = month
    ? (result.rows.find((row) => row.month === month)?.assets.investmentCorpus ?? 0)
    : 0;

  return (
    <Stack gap="sm">
      <MonthSelect
        label="Month"
        value={month}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <NumberInput
        label="Withdrawal Amount"
        value={amount}
        min={0}
        max={maxWithdrawal}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      <Text size="xs" c="dimmed">
        Available portfolio:{" "}
        <Text span fw={600} c="violet" style={{ fontVariantNumeric: "tabular-nums" }}>
          ₹{maxWithdrawal.toLocaleString()}
        </Text>
      </Text>

      <Button
        leftSection={<IconArrowUp size={16} />}
        color="orange"
        disabled={!month || amount <= 0 || amount > maxWithdrawal}
        onClick={() => {
          if (!month) return;
          addWithdrawal(month, amount);
          setAmount(0);
        }}
      >
        Add Withdrawal
      </Button>
    </Stack>
  );
}