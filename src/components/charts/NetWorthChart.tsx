import {
  Card,
  Stack,
  Text,
} from "@mantine/core";

import {
  LineChart,
} from "@mantine/charts";

import {
  useSimulation,
} from "../../hooks/useSimulation";
import { formatMonth } from "../../engine/monthFormatting";
import type { FinancialEvent } from "../../types/events";

export default function NetWorthChart() {
  const result =
    useSimulation();

  const data =
    result.rows.map(
      (row, index) => {
        const previous =
          index > 0
            ? result.rows[
            index - 1
            ]
            : null;

        const cash =
          Math.round(
            row.assets.cash
          );

        const investmentCorpus =
          Math.round(
            row.assets
              .investmentCorpus
          );

        const netWorth =
          Math.round(
            row.assets
              .netWorth
          );

        return {
          month:
            formatMonth(
              row.month
            ),

          cash,

          investmentCorpus,

          netWorth,

          events: row.events,

          cashDelta:
            previous
              ? cash -
              Math.round(
                previous
                  .assets
                  .cash
              )
              : 0,

          investmentDelta:
            previous
              ? investmentCorpus -
              Math.round(
                previous
                  .assets
                  .investmentCorpus
              )
              : 0,

          netWorthDelta:
            previous
              ? netWorth -
              Math.round(
                previous
                  .assets
                  .netWorth
              )
              : 0,

          isStartingPoint:
            index === 0,
        };
      }
    );

  function formatDelta(
    value: number
  ) {
    const sign =
      value >= 0
        ? "+"
        : "";

    return `${sign}₹${value.toLocaleString()}`;
  }

  function deltaColor(
    value: number
  ) {
    if (value > 0) {
      return "green";
    }

    if (value < 0) {
      return "red";
    }

    return "orange";
  }

  function getEventSummary(
    events: FinancialEvent[]
  ) {
    const summary = {
      bonus: 0,
      expenses: 0,
      creditCard: 0,
      fdCreated: 0,
      fdMatured: 0,
      rdCreated: 0,
      rdMatured: 0,
    };

    events.forEach(
      (event) => {
        switch (
        event.type
        ) {
          case "BONUS_INCOME":
            summary.bonus +=
              event.amount;
            break;

          case "ONE_OFF_EXPENSE":
            summary.expenses +=
              event.amount;
            break;

          case "CREDIT_CARD_EXPENSE":
            summary.creditCard +=
              event.amount;
            break;

          case "FD_CREATED":
            summary.fdCreated +=
              event.amount;
            break;

          case "FD_MATURED":
            summary.fdMatured +=
              event.amount;
            break;

          case "RD_CREATED":
            summary.rdCreated +=
              event.amount;
            break;

          case "RD_MATURED":
            summary.rdMatured +=
              event.amount;
            break;

          case "SALARY_CHANGE":
            break;
        }
      }
    );

    return summary;
  }

  function formatMoney(
    value: number
  ) {
    return (
      "₹" +
      Math.round(
        value
      ).toLocaleString()
    );
  }

  function formatMoneyCompact(
    value: number
  ) {
    if (value >= 10000000) {
      return `₹${(
        value / 10000000
      ).toFixed(2)} Cr`;
    }

    if (value >= 100000) {
      return `₹${(
        value / 100000
      ).toFixed(2)} L`;
    }

    if (value >= 1000) {
      return `₹${(
        value / 1000
      ).toFixed(1)} K`;
    }

    return `₹${Math.round(value)}`;
  }

  return (
    <Card
      mt="lg"
      radius="xl"
      shadow="xs"
      withBorder
      p="lg"
      style={{ minWidth: 0 }}
    >
      <Stack style={{ minWidth: 0 }}>
        <Stack gap={0}>
          <Text fw={700}>
            Wealth Projection
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Cash, investments and total net worth over time
          </Text>
        </Stack>
        <LineChart
          h={360}
          w="100%"
          data={data}
          dataKey="month"
          withLegend
          curveType="monotone"
          valueFormatter={(value) =>
            formatMoneyCompact(
              Number(value)
            )
          }
          series={[
            {
              name: "cash",
              label: "Cash",
              color: "blue",
            },
            {
              name: "investmentCorpus",
              label: "Investments",
              color: "green",
            },
            {
              name: "netWorth",
              label: "Net Worth",
              color: "violet",
            },
          ]}
          tooltipProps={{
            content: ({
              label,
              payload,
            }) => {
              if (
                !payload?.length
              ) {
                return null;
              }

              const point =
                payload[0]
                  .payload;

              const eventSummary =
                getEventSummary(
                  point.events
                );

              return (
                <Card
                  shadow="sm"
                  p="sm"
                >
                  <Stack gap={4}>
                    <Text fw={700}>
                      {label}
                    </Text>

                    {point.events.length > 0 && (
                      <>
                        <Text
                          mt="xs"
                          fw={700}
                          size="sm"
                        >
                          Events
                        </Text>

                        {eventSummary.bonus >
                          0 && (
                            <Text
                              size="xs"
                              c="green"
                            >
                              Bonus Income
                              {" • "}
                              +
                              {formatMoney(
                                eventSummary.bonus
                              )}
                            </Text>
                          )}

                        {eventSummary.expenses >
                          0 && (
                            <Text
                              size="xs"
                              c="red"
                            >
                              Expenses
                              {" • "}
                              -
                              {formatMoney(
                                eventSummary.expenses
                              )}
                            </Text>
                          )}

                        {eventSummary.creditCard >
                          0 && (
                            <Text
                              size="xs"
                              c="orange"
                            >
                              Credit Card
                              {" • "}
                              -
                              {formatMoney(
                                eventSummary.creditCard
                              )}
                            </Text>
                          )}

                        {eventSummary.fdCreated >
                          0 && (
                            <Text
                              size="xs"
                              c="orange"
                            >
                              FD Created
                              {" • "}
                              -
                              {formatMoney(
                                eventSummary.fdCreated
                              )}
                            </Text>
                          )}

                        {eventSummary.fdMatured >
                          0 && (
                            <Text
                              size="xs"
                              c="green"
                            >
                              FD Matured
                              {" • "}
                              +
                              {formatMoney(
                                eventSummary.fdMatured
                              )}
                            </Text>
                          )}

                        {eventSummary.rdCreated >
                          0 && (
                            <Text
                              size="xs"
                              c="orange"
                            >
                              RD Contributions
                              {" • "}
                              -
                              {formatMoney(
                                eventSummary.rdCreated
                              )}
                            </Text>
                          )}

                        {eventSummary.rdMatured >
                          0 && (
                            <Text
                              size="xs"
                              c="green"
                            >
                              RD Matured
                              {" • "}
                              +
                              {formatMoney(
                                eventSummary.rdMatured
                              )}
                            </Text>
                          )}
                      </>
                    )}

                    {point.isStartingPoint && (
                      <>
                        <Text size="sm">
                          Cash:
                          {" "}
                          ₹
                          {point.cash.toLocaleString()}
                        </Text>

                        <Text size="sm">
                          Investments:
                          {" "}
                          ₹
                          {point.investmentCorpus.toLocaleString()}
                        </Text>

                        <Text size="sm">
                          Net Worth:
                          {" "}
                          ₹
                          {point.netWorth.toLocaleString()}
                        </Text>
                      </>
                    )}

                    {!point.isStartingPoint && (
                      <>
                        <Text size="sm">
                          Cash:
                          {" "}
                          ₹
                          {point.cash.toLocaleString()}
                          {" ("}

                          <Text
                            span
                            c={deltaColor(
                              point.cashDelta
                            )}
                            fw={600}
                          >
                            {formatDelta(
                              point.cashDelta
                            )}
                          </Text>

                          {")"}
                        </Text>

                        <Text size="sm">
                          Investments:
                          {" "}
                          ₹
                          {point.investmentCorpus.toLocaleString()}
                          {" ("}

                          <Text
                            span
                            c={deltaColor(
                              point.investmentDelta
                            )}
                            fw={600}
                          >
                            {formatDelta(
                              point.investmentDelta
                            )}
                          </Text>

                          {")"}
                        </Text>

                        <Text size="sm">
                          Net Worth:
                          {" "}
                          ₹
                          {point.netWorth.toLocaleString()}
                          {" ("}

                          <Text
                            span
                            c={deltaColor(
                              point.netWorthDelta
                            )}
                            fw={600}
                          >
                            {formatDelta(
                              point.netWorthDelta
                            )}
                          </Text>

                          {")"}
                        </Text>
                      </>
                    )}
                  </Stack>
                </Card>
              );
            },
          }}
        />
      </Stack>
    </Card>
  );
}