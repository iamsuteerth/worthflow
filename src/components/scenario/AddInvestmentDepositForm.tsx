import { Button, NumberInput, Stack, Text } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";
import { useState } from "react";
import { useSimulation } from "../../hooks/useSimulation";
import { usePlannerStore } from "../../store/plannerStore";
import type { MonthKey } from "../../types/simulation";
import MonthSelect from "../common/MonthSelect";

export default function AddInvestmentDepositForm() {
  const result = useSimulation();
  const addDeposit = usePlannerStore((state) => state.addTransientInvestmentDeposit);
  const startMonth = usePlannerStore((state) => state.config.forecast.startMonth);

  const [month, setMonth] = useState<MonthKey | null>(startMonth);
  const [amount, setAmount] = useState(0);

  const maxDeposit = month
    ? (result.rows.find((row) => row.month === month)?.closingBalance ?? 0)
    : 0;

  return (
    <Stack gap="sm">
      <MonthSelect
        label="Month"
        value={month}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <NumberInput
        label="Deposit Amount"
        value={amount}
        min={0}
        max={maxDeposit}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      <Text size="xs" c="dimmed">
        Available cash:{" "}
        <Text span fw={600} c="green" style={{ fontVariantNumeric: "tabular-nums" }}>
          ₹{maxDeposit.toLocaleString()}
        </Text>
      </Text>

      <Button
        leftSection={<IconArrowDown size={16} />}
        color="indigo"
        disabled={!month || amount <= 0 || amount > maxDeposit}
        onClick={() => {
          if (!month) return;
          addDeposit(month, amount);
          setAmount(0);
        }}
      >
        Add Deposit
      </Button>
    </Stack>
  );
}