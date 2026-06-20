import { Button, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import MonthSelect from "@/components/common/MonthSelect";
import { forecastEndMonth } from "@/engine/dateUtils";
import type { MonthKey } from "@/types/simulation";

export default function AddBonusForm() {
  const addBonus = usePlannerStore((state) => state.addTransientBonusIncome);
  const config = usePlannerStore((state) => state.config);

  const forecastEnd = forecastEndMonth(config.forecast.startMonth, config.forecast.totalMonths);

  const [month, setMonth] = useState<MonthKey | null>(config.forecast.startMonth);
  const [amount, setAmount] = useState(50000);
  const [description, setDescription] = useState("");

  return (
    <Stack gap="sm">
      <MonthSelect
        value={month}
        minMonth={config.forecast.startMonth}
        maxMonth={forecastEnd}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <NumberInput
        label="Bonus Amount"
        value={amount}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setAmount(Number(value))}
      />

      <TextInput
        maxLength={50}
        label="Description"
        placeholder="e.g. Annual performance bonus"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />

      <Button
        leftSection={<IconPlus size={16} />}
        color="teal"
        disabled={!month || amount <= 0 || !description.trim()}
        onClick={() => {
          if (!month) return;
          addBonus(month, amount, description.trim());
          setDescription("");
          setAmount(50000);
        }}
      >
        Add Bonus
      </Button>
    </Stack>
  );
}