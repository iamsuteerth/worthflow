import { Button, Group, Text } from "@mantine/core";
import { IconFilter, IconFilterOff } from "@tabler/icons-react";
import { useFilterStore } from "@/store/filterStore";
import { useSimulation } from "@/hooks/useSimulation";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";

export default function MonthRangeFilter() {
  const { startMonth, endMonth, setStartMonth, setEndMonth, reset } = useFilterStore();
  const result = useSimulation();

  const forecastStart = result.rows[0]?.month ?? null;
  const forecastEnd = result.rows[result.rows.length - 1]?.month ?? null;

  const isFiltered = !!(startMonth || endMonth);

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <IconFilter size={16} style={{ color: "var(--mantine-color-dimmed)", marginBottom: 4 }} />
      <Text size="sm" c="dimmed" style={{ marginBottom: 4 }}>
        Filter:
      </Text>

      <MonthSelect
        label="From"
        value={startMonth}
        minMonth={forecastStart ?? undefined}
        maxMonth={endMonth ?? forecastEnd ?? undefined}
        onChange={(v) => setStartMonth(v as MonthKey | null)}
        size="xs"
      />

      <MonthSelect
        label="To"
        value={endMonth}
        minMonth={startMonth ?? forecastStart ?? undefined}
        maxMonth={forecastEnd ?? undefined}
        onChange={(v) => setEndMonth(v as MonthKey | null)}
        size="xs"
      />

      {isFiltered && (
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={<IconFilterOff size={14} />}
          onClick={reset}
          style={{ marginBottom: 1 }}
        >
          Clear
        </Button>
      )}
    </Group>
  );
}