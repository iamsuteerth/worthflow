import {
  Select,
} from "@mantine/core";

import {
  formatMonth,
} from "../../engine/monthFormatting";

interface Props {
  value: string | null;

  onChange: (
    value: string | null
  ) => void;

  label?: string;
}

function buildMonths(): {
  value: string;
  label: string;
}[] {
  return Array.from(
    { length: 180 },
    (_, index) => {
      const date =
        new Date();

      date.setMonth(
        date.getMonth() -
        120 +
        index
      );

      const value =
        `${date.getFullYear()}-${String(
          date.getMonth() +
          1
        ).padStart(
          2,
          "0"
        )}`;

      return {
        value,
        label:
          formatMonth(
            value
          ),
      };
    }
  );
}

const MONTH_OPTIONS = buildMonths();

export default function BuilderMonthSelect({
  value,
  onChange,
  label = "Month",
}: Props) {
  return (
    <Select
      label={label}
      data={MONTH_OPTIONS}
      value={value}
      onChange={onChange}
      searchable
    />
  );
}