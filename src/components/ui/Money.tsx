import { Text, Tooltip, type TextProps } from "@mantine/core";
import { money, moneyCompact } from "@/format/money";

interface MoneyProps extends Omit<TextProps, "children"> {
  value: number;
  compact?: boolean;
  signed?: boolean;
}

export function Money({
  value,
  compact = false,
  signed = false,
  ...textProps
}: MoneyProps) {
  const abs = Math.abs(value);
  const sign = signed ? (value >= 0 ? "+" : "−") : "";

  const fullText = signed
    ? `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`
    : money(value);

  const displayText = compact
    ? signed
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
