// src/components/timeline/InvestmentTimeline.tsx
import {
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconChartLine,
  IconCoins,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";

const INVESTMENT_TYPES = new Set([
  "ACCOUNT_AMOUNT_OVERRIDE",
  "ACCOUNT_RETURN_OVERRIDE",
  "INVESTMENT_DEPOSIT",
  "INVESTMENT_WITHDRAWAL",
]);

function getEventIcon(type: string) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":      return <IconArrowDown size={16} />;
    case "INVESTMENT_WITHDRAWAL":   return <IconArrowUp size={16} />;
    case "ACCOUNT_RETURN_OVERRIDE": return <IconTrendingUp size={16} />;
    case "ACCOUNT_AMOUNT_OVERRIDE": return <IconChartLine size={16} />;
    default:                        return <IconCoins size={16} />;
  }
}

function getEventLabel(type: string) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":      return "Deposit";
    case "INVESTMENT_WITHDRAWAL":   return "Withdrawal";
    case "ACCOUNT_AMOUNT_OVERRIDE": return "Amount Override";
    case "ACCOUNT_RETURN_OVERRIDE": return "Return Override";
    default:                        return type;
  }
}

function getEventColor(type: string) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":      return "blue";
    case "INVESTMENT_WITHDRAWAL":   return "orange";
    case "ACCOUNT_AMOUNT_OVERRIDE": return "indigo";
    case "ACCOUNT_RETURN_OVERRIDE": return "grape";
    default:                        return "gray";
  }
}

function formatMoney(amount: number) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

// Read-only visual timeline of investment-account events, scoped by the
// dashboard's single global month-range filter (RD-5). No type chips (NS-4)
// and no edit/delete — that lives in the Events tab via InvestmentEventGroups.
export default function InvestmentTimeline() {
  const result = useFilteredSimulation();

  const rows = result.rows.filter((row) =>
    row.events.some((e) => INVESTMENT_TYPES.has(e.type))
  );

  if (rows.length === 0) {
    return (
      <Paper withBorder radius="xl" p="xl">
        <Stack gap={4} align="center">
          <Text fw={600}>No Investment Events</Text>
          <Text size="sm" c="dimmed">
            Account deposits, withdrawals, and overrides will appear here.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Timeline bulletSize={30} lineWidth={2}>
      {rows.flatMap((row) =>
        row.events
          .filter((e) => INVESTMENT_TYPES.has(e.type))
          .map((event) => (
            <Timeline.Item
              key={event.id}
              bullet={
                <ThemeIcon size="md" radius="xl" variant="light" color={getEventColor(event.type)}>
                  {getEventIcon(event.type)}
                </ThemeIcon>
              }
              title={
                <Group gap="xs">
                  <Text fw={600} size="sm">{event.description}</Text>
                  <Badge color={getEventColor(event.type)} variant="light" size="sm">
                    {getEventLabel(event.type)}
                  </Badge>
                </Group>
              }
            >
              <Stack gap={4} mt={4}>
                <Text size="xs" c="dimmed">{formatMonth(row.month)}</Text>
                <Text fw={700}>
                  {event.type === "ACCOUNT_RETURN_OVERRIDE"
                    ? `${event.amount.toFixed(2)}%`
                    : formatMoney(event.amount)}
                </Text>
              </Stack>
            </Timeline.Item>
          ))
      )}
    </Timeline>
  );
}
