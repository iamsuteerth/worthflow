import type { MonthKey } from "@/types/simulation";

import { Button, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconTrendingUp } from "@tabler/icons-react";
import { useState } from "react";

import MonthSelect from "@/components/common/MonthSelect";
import { forecastEndMonth } from "@/engine/dateUtils";
import { usePlannerStore } from "@/store/plannerStore";

export default function AddSalaryChangeForm() {
  const addSalaryChange = usePlannerStore((state) => state.addTransientSalaryChange);
  const config = usePlannerStore((state) => state.config);

  const forecastEnd = forecastEndMonth(config.forecast.startMonth, config.forecast.totalMonths);

  const [month, setMonth] = useState<MonthKey | null>(config.forecast.startMonth);
  const [newSalary, setNewSalary] = useState(150000);
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
        label="New Monthly Salary"
        value={newSalary}
        min={0}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setNewSalary(Number(value))}
      />

      <TextInput
        maxLength={50}
        label="Description"
        placeholder="e.g. Promotion to senior role"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />

      <Button
        leftSection={<IconTrendingUp size={16} />}
        color="brand"
        disabled={!month || newSalary < 0 || !description.trim()}
        onClick={() => {
          if (!month) return;
          addSalaryChange(month, newSalary, description.trim());
          setDescription("");
        }}
      >
        Add Salary Change
      </Button>
    </Stack>
  );
}