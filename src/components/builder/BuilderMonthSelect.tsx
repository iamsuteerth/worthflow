import { Select } from "@mantine/core";

import { formatMonth } from "../../engine/monthFormatting";

interface Props {
  value: string | null;
  onChange: (
    value: string | null
  ) => void;

  label?: string;

  minMonth?: string;
  maxMonth?: string;
}

function buildMonths(): {
  value: string;
  label: string;
}[] {
  return Array.from({ length: 180 }, (_, index) => {
    const date = new Date();

    date.setMonth(date.getMonth() - 120 + index);

    const value = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    return {
      value,
      label: formatMonth(value),
    };
  });
}

const MONTH_OPTIONS = buildMonths();

export default function BuilderMonthSelect({
  value,
  onChange,
  label = "Month",
  minMonth,
  maxMonth
}: Props) {
  const options =
    MONTH_OPTIONS.filter(
      (month) =>
        (!minMonth ||
          month.value >= minMonth) &&
        (!maxMonth ||
          month.value <= maxMonth)
    );

  return (
    <Select
      label={label}
      data={options}
      value={value}
      onChange={onChange}
      searchable
    />
  );
}