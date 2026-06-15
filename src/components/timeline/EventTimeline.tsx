// src/components/timeline/EventTimeline.tsx
import {
  Badge,
  Chip,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";

import {
  IconArrowUp,
  IconArrowDown,
  IconBriefcase,
  IconCoins,
  IconRepeat,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";

import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { useFilterStore } from "@/store/filterStore";
import { EVENT_CATEGORY_LIST, getEventCategory } from "@/engine/eventCategories";

function getEventIcon(type: string) {
  switch (type) {
    case "BONUS_INCOME":          return <IconCoins size={16} />;
    case "SALARY_CHANGE":         return <IconTrendingUp size={16} />;
    case "ONE_OFF_EXPENSE":       return <IconArrowDown size={16} />;
    case "RECURRING_EXPENSE":     return <IconRepeat size={16} />;
    case "CREDIT_CARD_EXPENSE":   return <IconWallet size={16} />;
    case "FD_CREATED":            return <IconWallet size={16} />;
    case "FD_MATURED":            return <IconArrowUp size={16} />;
    case "RD_CREATED":            return <IconBriefcase size={16} />;
    case "RD_MATURED":            return <IconArrowUp size={16} />;
    case "INVESTMENT_DEPOSIT":    return <IconArrowDown size={16} />;
    case "INVESTMENT_WITHDRAWAL": return <IconArrowUp size={16} />;
    default:                      return <IconCoins size={16} />;
  }
}

function getEventLabel(type: string) {
  switch (type) {
    case "BONUS_INCOME":          return "Bonus Income";
    case "SALARY_CHANGE":         return "Salary Change";
    case "ONE_OFF_EXPENSE":       return "Expense";
    case "RECURRING_EXPENSE":     return "Recurring";
    case "CREDIT_CARD_EXPENSE":   return "Credit Card";
    case "FD_CREATED":            return "FD Created";
    case "FD_MATURED":            return "FD Matured";
    case "RD_CREATED":            return "RD Created";
    case "RD_MATURED":            return "RD Matured";
    case "INVESTMENT_DEPOSIT":    return "Portfolio Deposit";
    case "INVESTMENT_WITHDRAWAL": return "Portfolio Withdrawal";
    default:                      return type;
  }
}

function getEventColor(type: string) {
  switch (type) {
    case "BONUS_INCOME":          return "green";
    case "SALARY_CHANGE":         return "blue";
    case "ONE_OFF_EXPENSE":       return "red";
    case "RECURRING_EXPENSE":     return "red";
    case "FD_CREATED":
    case "FD_MATURED":            return "cyan";
    case "RD_CREATED":
    case "RD_MATURED":            return "grape";
    case "CREDIT_CARD_EXPENSE":   return "orange";
    case "INVESTMENT_DEPOSIT":    return "blue";
    case "INVESTMENT_WITHDRAWAL": return "orange";
    default:                      return "gray";
  }
}

function formatMoney(amount: number) {
  return "₹" + Math.round(amount).toLocaleString();
}

// Event types shown in the general timeline
const EXCLUDED_TYPES = new Set([
  "ACCOUNT_AMOUNT_OVERRIDE",
  "ACCOUNT_RETURN_OVERRIDE",
]);

export default function EventTimeline() {
  const result = useFilteredSimulation();
  const { categoryFilter, toggleCategory } = useFilterStore();

  const isVisible = (type: string) =>
    !EXCLUDED_TYPES.has(type) &&
    (categoryFilter.length === 0 ||
      categoryFilter.includes(getEventCategory(type as Parameters<typeof getEventCategory>[0])));

  const rows = result.rows.filter((row) => row.events.some((e) => isVisible(e.type)));

  return (
    <Stack gap="md">
      <Group gap={6} wrap="wrap">
        {EVENT_CATEGORY_LIST.map((category) => (
          <Chip
            key={category}
            size="xs"
            variant="light"
            checked={categoryFilter.includes(category)}
            onChange={() => toggleCategory(category)}
          >
            {category}
          </Chip>
        ))}
      </Group>

      {rows.length === 0 ? (
        <Paper withBorder radius="xl" p="xl">
          <Stack gap={4} align="center">
            <Text fw={600}>No Timeline Events</Text>
            <Text size="sm" c="dimmed">
              Scenario changes and investment lifecycle events will appear here.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Timeline bulletSize={30} lineWidth={2}>
          {rows.flatMap((row) =>
            row.events
              .filter((e) => isVisible(e.type))
              .map((event) => (
                <Timeline.Item
                  key={event.id}
                  bullet={
                    <ThemeIcon
                      size="md"
                      radius="xl"
                      variant="light"
                      color={getEventColor(event.type)}
                    >
                      {getEventIcon(event.type)}
                    </ThemeIcon>
                  }
                  title={
                    <Group gap="xs" align="center">
                      <Text fw={600} size="sm">
                        {event.description}
                      </Text>
                      <Badge
                        color={getEventColor(event.type)}
                        variant="light"
                        size="sm"
                      >
                        {getEventLabel(event.type)}
                      </Badge>
                    </Group>
                  }
                >
                  <Stack gap={4} mt={4}>
                    <Text size="xs" c="dimmed" fw={500}>
                      {formatMonth(row.month)}
                    </Text>
                    <Text fw={700} size="lg">
                      {formatMoney(event.amount)}
                    </Text>
                  </Stack>
                </Timeline.Item>
              ))
          )}
        </Timeline>
      )}
    </Stack>
  );
}