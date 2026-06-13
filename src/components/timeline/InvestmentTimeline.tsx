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
  IconCoins,
  IconTrendingUp,
} from "@tabler/icons-react";

import {
  useSimulation,
} from "../../hooks/useSimulation";

import {
  formatMonth,
} from "../../engine/monthFormatting";

function getEventIcon(
  type: string
) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":
      return (
        <IconArrowDown
          size={16}
        />
      );

    case "INVESTMENT_WITHDRAWAL":
      return (
        <IconArrowUp
          size={16}
        />
      );

    case "INVESTMENT_RETURN_OVERRIDE":
      return (
        <IconTrendingUp
          size={16}
        />
      );

    default:
      return (
        <IconCoins
          size={16}
        />
      );
  }
}

function getEventLabel(
  type: string
) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":
      return "Portfolio Deposit";

    case "INVESTMENT_WITHDRAWAL":
      return "Portfolio Withdrawal";

    case "INVESTMENT_OVERRIDE":
      return "Investment Override";

    case "INVESTMENT_RETURN_OVERRIDE":
      return "Return Override";

    default:
      return type;
  }
}

function getEventColor(
  type: string
) {
  switch (type) {
    case "INVESTMENT_DEPOSIT":
      return "blue";

    case "INVESTMENT_WITHDRAWAL":
      return "orange";

    case "INVESTMENT_OVERRIDE":
      return "violet";

    case "INVESTMENT_RETURN_OVERRIDE":
      return "grape";

    default:
      return "gray";
  }
}

function formatMoney(
  amount: number
) {
  return (
    "₹" +
    Math.round(
      amount
    ).toLocaleString()
  );
}

export default function InvestmentTimeline() {
  const result =
    useSimulation();

  const rows =
    result.rows.filter(
      (row) =>
        row.events.some(
          (event) =>
            event.type ===
              "INVESTMENT_OVERRIDE" ||
            event.type ===
              "INVESTMENT_RETURN_OVERRIDE" ||
            event.type ===
              "INVESTMENT_DEPOSIT" ||
            event.type ===
              "INVESTMENT_WITHDRAWAL"
        )
    );

  if (
    rows.length === 0
  ) {
    return (
      <Paper
        withBorder
        radius="xl"
        p="xl"
      >
        <Stack
          gap={4}
          align="center"
        >
          <Text fw={600}>
            No Investment Events
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Investment changes
            will appear here.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Timeline
      bulletSize={30}
      lineWidth={2}
    >
      {rows.flatMap(
        (row) =>
          row.events
            .filter(
              (event) =>
                event.type ===
                  "INVESTMENT_OVERRIDE" ||
                event.type ===
                  "INVESTMENT_RETURN_OVERRIDE" ||
                event.type ===
                  "INVESTMENT_DEPOSIT" ||
                event.type ===
                  "INVESTMENT_WITHDRAWAL"
            )
            .map(
              (event) => (
                <Timeline.Item
                  key={
                    event.id
                  }
                  bullet={
                    <ThemeIcon
                      size="md"
                      radius="xl"
                      variant="light"
                      color={getEventColor(
                        event.type
                      )}
                    >
                      {getEventIcon(
                        event.type
                      )}
                    </ThemeIcon>
                  }
                  title={
                    <Group
                      gap="xs"
                    >
                      <Text
                        fw={600}
                        size="sm"
                      >
                        {
                          event.description
                        }
                      </Text>

                      <Badge
                        color={getEventColor(
                          event.type
                        )}
                        variant="light"
                      >
                        {getEventLabel(
                          event.type
                        )}
                      </Badge>
                    </Group>
                  }
                >
                  <Stack
                    gap={4}
                    mt={4}
                  >
                    <Text
                      size="xs"
                      c="dimmed"
                    >
                      {formatMonth(
                        row.month
                      )}
                    </Text>

                    <Text
                      fw={700}
                    >
                      {event.type ===
                      "INVESTMENT_RETURN_OVERRIDE"
                        ? `${event.amount.toFixed(
                            2
                          )}%`
                        : formatMoney(
                            event.amount
                          )}
                    </Text>
                  </Stack>
                </Timeline.Item>
              )
            )
      )}
    </Timeline>
  );
}