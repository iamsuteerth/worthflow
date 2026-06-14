// src/components/common/MonthSelect.tsx
import {
  Select,
} from "@mantine/core";

import {
  useSimulation,
} from "@/hooks/useSimulation";

import {
  formatMonth,
} from "@/engine/monthFormatting";

interface Props {
  value: string | null;

  onChange: (
    value: string | null
  ) => void;

  label?: string;

  minMonth?: string;

  maxMonth?: string;
}

export default function MonthSelect({
  value,
  onChange,
  label = "Month",
  minMonth,
  maxMonth,
}: Props) {
  const result =
    useSimulation();

  const months =
    result.rows
      .map(
        (row) => ({
          value: row.month,
          label: formatMonth(
            row.month
          ),
        })
      )
      .filter(
        (month) =>
          (!minMonth ||
            month.value >= minMonth) &&
          (!maxMonth ||
            month.value <= maxMonth)
      );

  return (
    <Select
      defaultValue={value}
      label={label}
      data={months}
      value={value}
      onChange={onChange}
    />
  );
}