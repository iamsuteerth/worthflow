import { Grid, Text, Tooltip } from "@mantine/core";

import {
  IconChartLine,
  IconCoins,
  IconTrendingDown,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";

import { useSimulation } from "@/hooks/useSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { AdaptiveMoney, StatCard } from "@/components/ui";

export default function SummaryCards() {
  const result = useSimulation();

  if (result.rows.length === 0) return null;

  const finalRow = result.rows[result.rows.length - 1];
  const { summary } = result;

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Net Worth"
          value={<AdaptiveMoney value={finalRow.assets.netWorth} />}
          sub="End of forecast"
          negative={finalRow.assets.netWorth < 0}
          icon={<IconChartLine size={18} />}
          iconColor="teal"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Cash"
          value={<AdaptiveMoney value={finalRow.assets.cash} />}
          sub={
            <Tooltip
              multiline
              w={250}
              withArrow
              position="bottom"
              events={{ hover: true, focus: true, touch: true }}
              label="Lowest balance your cash touches at any point within a month. It can be lower than every month-end figure in the tables — e.g. a mid-month dip before an FD/RD matures that same month."
            >
              <Text span size="xs" c="dimmed" style={{ cursor: "help", borderBottom: "1px dotted currentColor" }}>
                Lowest: {money(summary.lowestBalance)} ({formatMonth(summary.lowestBalanceMonth)})
              </Text>
            </Tooltip>
          }
          negative={finalRow.assets.cash < 0}
          icon={<IconWallet size={18} />}
          iconColor="brand"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <StatCard
          title="Investments"
          value={<AdaptiveMoney value={finalRow.assets.investmentCorpus} />}
          sub="End of forecast"
          negative={finalRow.assets.investmentCorpus < 0}
          icon={<IconCoins size={18} />}
          iconColor="violet"
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        {(() => {
          const raw = summary.xirr;
          const xirrVal = raw !== null ? parseFloat(raw.toFixed(2)) : null;
          const xirrDisplay = xirrVal === null ? "N/A" : `${xirrVal.toFixed(2)}%`;
          return (
            <StatCard
              title="XIRR"
              value={xirrDisplay}
              sub="Portfolio return"
              negative={xirrVal !== null && xirrVal < 0}
              valueColor={xirrVal !== null && xirrVal > 0 ? "teal.6" : undefined}
              icon={xirrVal !== null && xirrVal > 0 ? <IconTrendingUp size={18} /> : <IconTrendingDown size={18} />}
              iconColor="orange"
            />
          );
        })()}
      </Grid.Col>
    </Grid>
  );
}
