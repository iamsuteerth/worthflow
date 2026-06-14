import {
  Card,
  Grid,
  Group,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";

import {
  IconChartLine,
  IconCoins,
  IconWallet,
} from "@tabler/icons-react";

import {
  useSimulation,
} from "@/hooks/useSimulation";

import type {
  ReactNode,
} from "react";

function MetricCard({
  title,
  value,
  icon,
  negative = false,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  negative?: boolean;
}) {
  return (
    <Card
      radius="24px"
      withBorder
      p="lg"
      shadow="xs"
    >
      <Group
        justify="space-between"
        mb="md"
      >
        <Text
          size="sm"
          c="dimmed"
          fw={500}
        >
          {title}
        </Text>

        <ThemeIcon
          size="lg"
          radius="xl"
          variant="light"
          color={
            title === "Net Worth"
              ? "green"
              : title === "Cash"
                ? "blue"
                : title === "Investments"
                  ? "grape"
                  : "orange"
          }
        >
          {icon}
        </ThemeIcon>
      </Group>

      <Title
        order={2}
        fw={700}
        c={
          negative
            ? "red.6"
            : undefined
        }
      >
        {value}
      </Title>

      <Text
        size="xs"
        c="dimmed"
        mt={6}
      >
        Current Forecast
      </Text>
    </Card>
  );
}

export default function SummaryCards() {
  const result =
    useSimulation();

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  const finalRow =
    result.rows[
      result.rows.length - 1
    ];

  return (
    <Grid>
      <Grid.Col
        span={{
          base: 12,
          md: 3,
        }}
      >
        <MetricCard
          title="Net Worth"
          value={`₹${Math.round(
            finalRow.assets
              .netWorth
          ).toLocaleString()}`}
          negative={
            finalRow.assets
              .netWorth < 0
          }
          icon={
            <IconChartLine
              size={18}
            />
          }
        />
      </Grid.Col>

      <Grid.Col
        span={{
          base: 12,
          md: 3,
        }}
      >
        <MetricCard
          title="Cash"
          value={`₹${Math.round(
            finalRow.assets
              .cash
          ).toLocaleString()}`}
          negative={
            finalRow.assets
              .cash < 0
          }
          icon={
            <IconWallet
              size={18}
            />
          }
        />
      </Grid.Col>

      <Grid.Col
        span={{
          base: 12,
          md: 3,
        }}
      >
        <MetricCard
          title="Investments"
          value={`₹${Math.round(
            finalRow.assets
              .investmentCorpus
          ).toLocaleString()}`}
          negative={
            finalRow.assets
              .investmentCorpus <
            0
          }
          icon={
            <IconCoins
              size={18}
            />
          }
        />
      </Grid.Col>

      <Grid.Col
        span={{
          base: 12,
          md: 3,
        }}
      >
        <MetricCard
          title="XIRR"
          value={
            result.summary
              .xirr === null
              ? "N/A"
              : `${result.summary.xirr.toFixed(
                  2
                )}%`
          }
          negative={
            result.summary
              .xirr !== null &&
            result.summary
              .xirr < 0
          }
          icon={
            <IconChartLine
              size={18}
            />
          }
        />
      </Grid.Col>
    </Grid>
  );
}