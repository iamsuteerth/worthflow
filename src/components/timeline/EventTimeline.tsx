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
  IconArrowUp,
  IconArrowDown,
  IconBriefcase,
  IconCoins,
  IconTrendingUp,
  IconWallet,
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
    case "BONUS_INCOME":
      return (
        <IconCoins
          size={16}
        />
      );

    case "SALARY_CHANGE":
      return (
        <IconTrendingUp
          size={16}
        />
      );

    case "ONE_OFF_EXPENSE":
      return (
        <IconArrowDown
          size={16}
        />
      );

    case "CREDIT_CARD_EXPENSE":
      return (
        <IconWallet size={16} />
      );

    case "FD_CREATED":
      return (
        <IconWallet
          size={16}
        />
      );

    case "FD_MATURED":
      return (
        <IconArrowUp
          size={16}
        />
      );

    case "RD_CREATED":
      return (
        <IconBriefcase
          size={16}
        />
      );

    case "RD_MATURED":
      return (
        <IconArrowUp
          size={16}
        />
      );

    case "INVESTMENT_OVERRIDE":
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
    case "BONUS_INCOME":
      return "Bonus Income";

    case "SALARY_CHANGE":
      return "Salary Change";

    case "ONE_OFF_EXPENSE":
      return "Expense";

    case "CREDIT_CARD_EXPENSE":
      return "Credit Card";

    case "FD_CREATED":
      return "FD Created";

    case "FD_MATURED":
      return "FD Matured";

    case "RD_CREATED":
      return "RD Created";

    case "RD_MATURED":
      return "RD Matured";

    case "INVESTMENT_OVERRIDE":
      return "Investment Change";

    default:
      return type;
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

function getEventColor(
  type: string
) {
  switch (type) {
    case "BONUS_INCOME":
      return "green";

    case "SALARY_CHANGE":
      return "blue";

    case "ONE_OFF_EXPENSE":
      return "red";

    case "FD_CREATED":
    case "FD_MATURED":
      return "cyan";

    case "RD_CREATED":
    case "RD_MATURED":
      return "grape";

    case "CREDIT_CARD_EXPENSE":
      return "orange";

    case "INVESTMENT_OVERRIDE":
      return "violet";

    default:
      return "gray";
  }
}

export default function EventTimeline() {
  const result =
    useSimulation();

  const rows =
    result.rows.filter(
      (row) =>
        row.events.length > 0
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
            No Timeline Events
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Scenario changes and
            investment lifecycle
            events will appear here.
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
          row.events.map(
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
                    align="center"
                  >
                    <Text fw={600} size="sm">
                      {
                        event.description
                      }
                    </Text>

                    <Badge
                      color={getEventColor(
                        event.type
                      )}
                      variant="light"
                      size="sm"
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
                    fw={500}
                  >
                    {formatMonth(
                      row.month
                    )}
                  </Text>

                  <Text
                    fw={700}
                    size="lg"
                  >
                    {formatMoney(
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