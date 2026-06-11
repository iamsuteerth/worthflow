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
            "₹" +
            Number(value).toLocaleString()
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

              return (
                <Card
                  shadow="sm"
                  p="sm"
                >
                  <Stack gap={4}>
                    <Text fw={700}>
                      {label}
                    </Text>

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