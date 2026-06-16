import { Card, Grid, Group, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconChartLine,
  IconCoins,
  IconTrendingDown,
  IconWallet,
} from "@tabler/icons-react";
import { useSimulation } from "@/hooks/useSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import type { ReactNode } from "react";

function MetricCard({
  title,
  value,
  sub,
  icon,
  iconColor,
  negative = false,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  iconColor: string;
  negative?: boolean;
}) {
  return (
    <Card radius="24px" withBorder p="lg" shadow="xs">
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed" fw={500}>
          {title}
        </Text>
        <ThemeIcon size="lg" radius="xl" variant="light" color={iconColor}>
          {icon}
        </ThemeIcon>
      </Group>

      <Title order={2} fw={700} c={negative ? "red.6" : undefined}>
        {value}
      </Title>

      {sub && (
        <Text size="xs" c="dimmed" mt={4}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

export default function SummaryCards() {
  // Summary always uses the FULL simulation (not filtered) per spec
  const result = useSimulation();

  if (result.rows.length === 0) return null;

  const finalRow = result.rows[result.rows.length - 1];
  const { summary } = result;

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 3 }}>
        <MetricCard
          title="Net Worth"
          value={`₹${Math.round(finalRow.assets.netWorth).toLocaleString("en-IN")}`}
          sub="End of forecast"
          negative={finalRow.assets.netWorth < 0}
          icon={<IconChartLine size={18} />}
          iconColor="green"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <MetricCard
          title="Cash"
          value={`₹${Math.round(finalRow.assets.cash).toLocaleString("en-IN")}`}
          sub={`Lowest: ₹${Math.round(summary.lowestBalance).toLocaleString("en-IN")} (${formatMonth(summary.lowestBalanceMonth)})`}
          negative={finalRow.assets.cash < 0}
          icon={<IconWallet size={18} />}
          iconColor="blue"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <MetricCard
          title="Investments"
          value={`₹${Math.round(finalRow.assets.investmentCorpus).toLocaleString("en-IN")}`}
          sub="End of forecast"
          negative={finalRow.assets.investmentCorpus < 0}
          icon={<IconCoins size={18} />}
          iconColor="grape"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <MetricCard
          title="XIRR"
          value={summary.xirr === null ? "N/A" : `${summary.xirr.toFixed(2)}%`}
          sub="Portfolio return"
          negative={summary.xirr !== null && summary.xirr < 0}
          icon={<IconTrendingDown size={18} />}
          iconColor="orange"
        />
      </Grid.Col>
    </Grid>
  );
}