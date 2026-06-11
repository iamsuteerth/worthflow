import {
  Card,
  Grid,
  Group,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";

import {
  IconBuildingBank,
  IconChartLine,
  IconCoins,
  IconWallet,
} from "@tabler/icons-react";

import {
  useSimulation,
} from "../hooks/useSimulation";

import {
  usePlannerStore,
} from "../store/plannerStore";

import type {
  ReactNode,
} from "react";

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
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

  const config =
    usePlannerStore(
      (state) =>
        state.config
    );

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
          title="Instruments"
          value={String(
            config.instruments
              .length
          )}
          icon={
            <IconBuildingBank
              size={18}
            />
          }
        />
      </Grid.Col>
    </Grid>
  );
}