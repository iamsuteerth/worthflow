import { Button, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { useState } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import MonthSelect from "@/components/common/MonthSelect";
import { forecastEndMonth } from "@/engine/dateUtils";
import type { MonthKey } from "@/types/simulation";

export default function AddExpenseForm() {
  const addExpense = usePlannerStore((state) => state.addTransientOneOffExpense);
  const config = usePlannerStore((state) => state.config);

  const forecastEnd = forecastEndMonth(config.forecast.startMonth, config.forecast.totalMonths);

  const [month, setMonth] = useState<MonthKey | null>(config.forecast.startMonth);
  const [amount, setAmount] = useState<number>(10000);
  const [label, setLabel] = useState("");

  return (
    <Stack gap="sm">
      <MonthSelect
        value={month}
        minMonth={config.forecast.startMonth}
        maxMonth={forecastEnd}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <NumberInput
        label="Amount"
        value={amount}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      <TextInput
        maxLength={50}
        label="Description"
        placeholder="e.g. Laptop repair"
        value={label}
        onChange={(e) => setLabel(e.currentTarget.value)}
      />

      <Button
        leftSection={<IconBolt size={16} />}
        color="red"
        disabled={!month || amount <= 0 || !label.trim()}
        onClick={() => {
          if (!month) return;
          addExpense(month, amount, label.trim());
          setLabel("");
          setAmount(10000);
        }}
      >
        Add Expense
      </Button>
    </Stack>
  );
}