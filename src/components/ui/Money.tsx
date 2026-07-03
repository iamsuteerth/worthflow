import type { TextProps } from "@mantine/core";

import { Text, Tooltip } from "@mantine/core";
import { money, moneyCompact, moneyParens, moneyCompactParens } from "@/format/money";

interface MoneyProps extends Omit<TextProps, "children"> {
  value: number;
  compact?: boolean;
  signed?: boolean;
  // Accounting style: negatives wrapped in brackets, positives unsigned.
  accounting?: boolean;
}

export function Money({
  value,
  compact = false,
  signed = false,
  accounting = false,
  ...textProps
}: MoneyProps) {
  const abs = Math.abs(value);
  const sign = signed ? (value >= 0 ? "+" : "−") : "";

  const fullText = accounting
    ? moneyParens(value)
    : signed
      ? `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`
      : money(value);

  const displayText = compact
    ? accounting
      ? moneyCompactParens(value)
      : signed
        ? `${sign}${moneyCompact(abs)}`
        : moneyCompact(value)
    : fullText;

  if (compact) {
    return (
      <Tooltip
        label={fullText}
        withArrow
        position="top"
        openDelay={150}
        withinPortal
        events={{ hover: true, focus: true, touch: true }}
      >
        <Text
          component="span"
          style={{ fontVariantNumeric: "tabular-nums", cursor: "default" }}
          {...textProps}
        >
          {displayText}
        </Text>
      </Tooltip>
    );
  }

  return (
    <Text component="span" style={{ fontVariantNumeric: "tabular-nums" }} {...textProps}>
      {displayText}
    </Text>
  );
}
