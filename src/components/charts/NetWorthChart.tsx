import type { FinancialEvent } from "@/types/events";

import { Card, Stack, Text, Group, Divider, Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import MonthRangeFilter from "@/components/common/MonthRangeFilter";
import { AreaChart } from "@mantine/charts";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { moneyCompact, moneySigned } from "@/format/money";
import { EmptyState } from "@/components/ui";

function deltaColor(value: number): string {
  if (value > 0) return "teal";
  if (value < 0) return "red";
  return "gray";
}

type EventSummary = {
  label: string;
  amount: number;
  sign: "+" | "-" | null;
  color: string;
};

function getEventSummary(events: FinancialEvent[]): EventSummary[] {
  const totals = {
    bonus: 0, expenses: 0, recurringExpenses: 0, creditCard: 0,
    fdCreated: 0, fdMatured: 0, rdCreated: 0, rdMatured: 0,
    investmentDeposit: 0, investmentWithdrawal: 0,
    amountOverride: 0, returnOverride: 0,
  };

  for (const event of events) {
    switch (event.type) {
      case "BONUS_INCOME":            totals.bonus += event.amount; break;
      case "ONE_OFF_EXPENSE":         totals.expenses += event.amount; break;
      case "RECURRING_EXPENSE":       totals.recurringExpenses += event.amount; break;
      case "CREDIT_CARD_EXPENSE":     totals.creditCard += event.amount; break;
      case "FD_CREATED":              totals.fdCreated += event.amount; break;
      case "FD_MATURED":              totals.fdMatured += event.amount; break;
      case "RD_CREATED":              totals.rdCreated += event.amount; break;
      case "RD_MATURED":              totals.rdMatured += event.amount; break;
      case "INVESTMENT_DEPOSIT":      totals.investmentDeposit += event.amount; break;
      case "INVESTMENT_WITHDRAWAL":   totals.investmentWithdrawal += event.amount; break;
      case "ACCOUNT_AMOUNT_OVERRIDE": totals.amountOverride += 1; break;
      case "ACCOUNT_RETURN_OVERRIDE": totals.returnOverride += 1; break;
    }
  }

  const results: EventSummary[] = [];
  if (totals.bonus > 0)
    results.push({ label: "Bonus",               amount: totals.bonus,             sign: "+", color: "teal"   });
  if (totals.expenses > 0)
    results.push({ label: "Expenses",             amount: totals.expenses,          sign: "-", color: "red"    });
  if (totals.recurringExpenses > 0)
    results.push({ label: "Recurring",            amount: totals.recurringExpenses, sign: "-", color: "red"    });
  if (totals.creditCard > 0)
    results.push({ label: "Credit Card",          amount: totals.creditCard,        sign: "-", color: "orange" });
  if (totals.fdCreated > 0)
    results.push({ label: "FD Created",           amount: totals.fdCreated,         sign: "-", color: "cyan"   });
  if (totals.fdMatured > 0)
    results.push({ label: "FD Matured",           amount: totals.fdMatured,         sign: "+", color: "teal"   });
  if (totals.rdCreated > 0)
    results.push({ label: "RD Contributions",     amount: totals.rdCreated,         sign: "-", color: "grape"  });
  if (totals.rdMatured > 0)
    results.push({ label: "RD Matured",           amount: totals.rdMatured,         sign: "+", color: "teal"   });
  if (totals.investmentDeposit > 0)
    results.push({ label: "Portfolio Deposit",    amount: totals.investmentDeposit,    sign: "-", color: "violet" });
  if (totals.investmentWithdrawal > 0)
    results.push({ label: "Portfolio Withdrawal", amount: totals.investmentWithdrawal, sign: "+", color: "teal"   });
  if (totals.amountOverride > 0)
    results.push({ label: "Amount Override",      amount: 0, sign: null, color: "gray" });
  if (totals.returnOverride > 0)
    results.push({ label: "Return Override",      amount: 0, sign: null, color: "gray" });

  return results;
}

type DataPoint = {
  month: string;
  cash: number;
  investmentCorpus: number;
  netWorth: number;
  cashDelta: number;
  investmentDelta: number;
  netWorthDelta: number;
  events: FinancialEvent[];
  isStartingPoint: boolean;
};

function ChartTooltip({
  label,
  payload,
}: {
  label?: string;
  payload?: { payload: DataPoint }[];
}) {
  if (!payload?.length) return null;

  const point = payload[0].payload;
  const eventSummary = getEventSummary(point.events);

  const rows: { label: string; value: number; delta: number | null }[] = [
    { label: "Cash",        value: point.cash,             delta: point.isStartingPoint ? null : point.cashDelta        },
    { label: "Investments", value: point.investmentCorpus, delta: point.isStartingPoint ? null : point.investmentDelta  },
    { label: "Net Worth",   value: point.netWorth,         delta: point.isStartingPoint ? null : point.netWorthDelta    },
  ];

  return (
    <Card shadow="md" radius="lg" p="md" withBorder style={{ minWidth: 220, maxWidth: 280 }}>
      <Stack gap="xs">
        <Text fw={700} size="sm">{label}</Text>

        {rows.map(({ label: rowLabel, value, delta }) => (
          <Group key={rowLabel} justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{rowLabel}</Text>
            <Group gap={6} wrap="nowrap">
              <Text size="xs" fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                {moneyCompact(value)}
              </Text>
              {delta !== null && (
                <Text
                  size="xs"
                  fw={500}
                  c={deltaColor(delta)}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {moneySigned(delta)}
                </Text>
              )}
            </Group>
          </Group>
        ))}

        {eventSummary.length > 0 && (
          <>
            <Divider my={2} />
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: "0.05em" }}>
              Events
            </Text>
            {eventSummary.map(({ label: evtLabel, amount, sign, color }) => (
              <Group key={evtLabel} justify="space-between" gap="xs" wrap="nowrap">
                <Text size="xs" c={color}>{evtLabel}</Text>
                {amount > 0 && sign && (
                  <Text size="xs" c={color} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {sign}{moneyCompact(amount)}
                  </Text>
                )}
              </Group>
            ))}
          </>
        )}
      </Stack>
    </Card>
  );
}

const SERIES = [
  { name: "cash",             label: "Cash",        color: "brand.6"  },
  { name: "investmentCorpus", label: "Investments", color: "violet.6" },
  { name: "netWorth",         label: "Net Worth",   color: "teal.6"   },
];

export default function NetWorthChart() {
  const result = useFilteredSimulation();

  // Only mount the chart once its container has a real measured width. recharts'
  // ResponsiveContainer logs a "width(-1)/height(-1)" warning if it renders into an
  // unsized container (which happens under StrictMode's throwaway mount / first paint);
  // gating on a measured width avoids that entirely.
  const { ref: chartRef, width: chartWidth } = useElementSize();

  const data: DataPoint[] = result.rows.map((row, index) => {
    const prev = index > 0 ? result.rows[index - 1] : null;

    const cash             = Math.round(row.assets.cash);
    const investmentCorpus = Math.round(row.assets.investmentCorpus);
    const netWorth         = Math.round(row.assets.netWorth);

    return {
      month: formatMonth(row.month),
      cash,
      investmentCorpus,
      netWorth,
      events: row.events,
      isStartingPoint: index === 0,
      cashDelta:       prev ? cash             - Math.round(prev.assets.cash)             : 0,
      investmentDelta: prev ? investmentCorpus - Math.round(prev.assets.investmentCorpus) : 0,
      netWorthDelta:   prev ? netWorth         - Math.round(prev.assets.netWorth)         : 0,
    };
  });

  return (
    <Card mt="lg" radius="lg" shadow="sm" withBorder p="lg" style={{ minWidth: 0 }}>
      <Stack gap="md" style={{ minWidth: 0 }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Text fw={700} size="lg">Wealth Projection</Text>
            <Text size="sm" c="dimmed">Cash, investments, and net worth over time</Text>
          </Stack>
          <Box><MonthRangeFilter /></Box>
        </Group>

        {data.length === 0 ? (
          <EmptyState
            title="No Data In Range"
            description="Adjust the month range filter to see the wealth projection."
          />
        ) : (
          <Box ref={chartRef} h={360}>
            {chartWidth > 0 && (
              <AreaChart
                h={360}
                w="100%"
                data={data}
                dataKey="month"
                withLegend
                curveType="monotone"
                valueFormatter={(value) => moneyCompact(Number(value))}
                series={SERIES}
                tooltipProps={{
                  content: ({ label, payload }) => (
                    <ChartTooltip
                      label={label != null ? String(label) : undefined}
                      payload={payload as unknown as { payload: DataPoint }[]}
                    />
                  ),
                }}
              />
            )}
          </Box>
        )}
      </Stack>
    </Card>
  );
}

