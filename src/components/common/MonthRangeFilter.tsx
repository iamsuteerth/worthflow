import type { MonthKey } from "@/types/simulation";

import { useState } from "react";
import { Group, Select } from "@mantine/core";
import { useFilterStore } from "@/store/filterStore";
import { useSimulation } from "@/hooks/useSimulation";
import { addMonths } from "@/engine/dateUtils";
import MonthSelect from "@/components/common/MonthSelect";

const PRESETS = [
  { value: "6m", label: "6 Months", months: 6 },
  { value: "1y", label: "1 Year", months: 12 },
  { value: "2y", label: "2 Years", months: 24 },
  { value: "3y", label: "3 Years", months: 36 },
];

export default function MonthRangeFilter() {
  const { startMonth, endMonth, setRange, setStartMonth, setEndMonth } = useFilterStore();
  const result = useSimulation();

  const [isCustom, setIsCustom] = useState(false);

  const totalMonths = result.rows.length;
  const forecastStart = result.rows[0]?.month ?? null;
  const forecastEnd = result.rows[totalMonths - 1]?.month ?? null;

  if (!forecastStart) return null;

  const presets = PRESETS.filter((p) => p.months < totalMonths);
  const presetEnd = (months: number) => addMonths(forecastStart, months - 1) as MonthKey;

  const selected: string = (() => {
    if (isCustom) return "custom";
    if (!startMonth && !endMonth) return "all";
    const preset = presets.find(
      (p) => startMonth === forecastStart && endMonth === presetEnd(p.months)
    );
    return preset?.value ?? "custom";
  })();

  const options = [
    { value: "all", label: "All Time" },
    ...presets.map((p) => ({ value: p.value, label: p.label })),
    { value: "custom", label: "Custom" },
  ];

  function handleSelect(value: string | null) {
    if (!value) return;
    setIsCustom(value === "custom");

    if (value === "all") {
      setRange(null, null);
    } else if (value === "custom") {
      setRange(startMonth ?? forecastStart, endMonth ?? forecastEnd);
    } else {
      const preset = PRESETS.find((p) => p.value === value);
      if (preset) setRange(forecastStart, presetEnd(preset.months));
    }
  }

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <Select
        label="Range"
        size="xs"
        w={130}
        data={options}
        value={selected}
        onChange={handleSelect}
        allowDeselect={false}
        checkIconPosition="right"
      />

      {selected === "custom" && (
        <Group gap="sm" align="flex-end" wrap="nowrap">
          <MonthSelect
            label="From"
            value={startMonth}
            minMonth={forecastStart}
            maxMonth={endMonth ?? forecastEnd ?? undefined}
            onChange={(v) => setStartMonth(v as MonthKey | null)}
            size="xs"
          />
          <MonthSelect
            label="To"
            value={endMonth}
            minMonth={startMonth ?? forecastStart}
            maxMonth={forecastEnd ?? undefined}
            onChange={(v) => setEndMonth(v as MonthKey | null)}
            size="xs"
          />
        </Group>
      )}
    </Group>
  );
}
