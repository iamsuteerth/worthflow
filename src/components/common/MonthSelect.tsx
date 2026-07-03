import type { MonthKey } from "@/types/simulation";

import { Select } from "@mantine/core";
import { useMemo } from "react";
import { formatMonth } from "@/engine/monthFormatting";

interface Props {
  value: MonthKey | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  minMonth?: MonthKey | string | null;
  maxMonth?: MonthKey | string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  required?: boolean;
  disabled?: boolean;
}

function generateOptions(
  minMonth?: string | null,
  maxMonth?: string | null
): { value: string; label: string }[] {
  const today = new Date();

  const start = minMonth
    ? new Date(`${minMonth}-01`)
    : new Date(today.getFullYear() - 2, today.getMonth(), 1);

  const end = maxMonth
    ? new Date(`${maxMonth}-01`)
    : new Date(today.getFullYear() + 5, today.getMonth(), 1);

  const options: { value: string; label: string }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}` as MonthKey;
    options.push({ value: key, label: formatMonth(key) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return options;
}

export default function MonthSelect({
  value,
  onChange,
  label = "Month",
  placeholder = "Select month",
  minMonth,
  maxMonth,
  size = "sm",
  required,
  disabled,
}: Props) {
  const options = useMemo(
    () => generateOptions(minMonth, maxMonth),
    [minMonth, maxMonth]
  );

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={options}
      value={value}
      onChange={onChange}
      searchable
      size={size}
      required={required}
      disabled={disabled}
    />
  );
}