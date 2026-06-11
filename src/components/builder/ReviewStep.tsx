import {
  useMemo,
} from "react";

import {
  builderToConfig,
} from "../../engine/builderToConfig";

import {
  exportPlan,
} from "../../engine/exportPlan";

import {
  formatMonth,
} from "../../engine/monthFormatting";

import {
  useBuilderStore,
} from "../../store/builderStore";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import {
  IconCalendarMonth,
  IconCash,
  IconWallet,
  IconCoins,
  IconChartLine,
  IconBolt,
  IconBuildingBank,
} from "@tabler/icons-react";

import {
  Button,
  Card,
  Divider,
  Grid,
  Group,
  JsonInput,
  Stack,
  Text,
} from "@mantine/core";

function ReviewMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      withBorder
      radius="md"
    >
      <Group
        justify="space-between"
        mb="xs"
      >
        <Text
          size="sm"
          c="dimmed"
        >
          {label}
        </Text>

        {icon}
      </Group>

      <Text
        fw={700}
        size="lg"
      >
        {value}
      </Text>
    </Card>
  );
}

export default function ReviewStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const loadPlan =
    usePlannerStore(
      (store) =>
        store.loadPlan
    );

  const setActiveView =
    usePlannerStore(
      (store) =>
        store.setActiveView
    );

  const config =
    useMemo(
      () =>
        builderToConfig(
          state
        ),
      [state]
    );

  return (
    <Stack>
      <Card
        withBorder
        radius="md"
      >
        <Stack>
          <Text
            fw={700}
            size="lg"
          >
            Review Plan
          </Text>

          <Divider />

          <Grid>
            <Grid.Col
              span={{
                base: 12,
                md: 6,
              }}
            >
              <ReviewMetric
                label="Forecast"
                value={`${state.totalMonths} months`}
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
                md: 6,
              }}
            >
              <ReviewMetric
                label="Start Month"
                value={formatMonth(
                  state.startMonth
                )}
                icon={
                  <IconCalendarMonth
                    size={18}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col
              span={{
                base: 12,
                md: 6,
              }}
            >
              <ReviewMetric
                label="Monthly Income"
                value={`₹${state.monthlyIncome.toLocaleString()}`}
                icon={
                  <IconCash
                    size={18}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col
              span={{
                base: 12,
                md: 6,
              }}
            >
              <ReviewMetric
                label="Monthly Expense"
                value={`₹${state.defaultMonthlyExpense.toLocaleString()}`}
                icon={
                  <IconBolt
                    size={18}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col
              span={{
                base: 12,
                md: 6,
              }}
            >
              <ReviewMetric
                label="Opening Cash"
                value={`₹${state.openingCash.toLocaleString()}`}
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
                md: 6,
              }}
            >
              <ReviewMetric
                label="Opening Investments"
                value={`₹${state.openingInvestmentCorpus.toLocaleString()}`}
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
                md: 4,
              }}
            >
              <ReviewMetric
                label="Investment Ranges"
                value={String(
                  state.investmentRanges
                    .length
                )}
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
                md: 4,
              }}
            >
              <ReviewMetric
                label="Events"
                value={String(
                  state.oneOffExpenses.length +
                  state.bonusIncome.length +
                  state.salaryChanges.length
                )}
                icon={
                  <IconBolt
                    size={18}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col
              span={{
                base: 12,
                md: 4,
              }}
            >
              <ReviewMetric
                label="Instruments"
                value={String(
                  state.instruments
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
        </Stack>
      </Card>

      <Card
        withBorder
        radius="md"
      >
        <Stack>
          <Text fw={700}>
            Generated Configuration
          </Text>

          <JsonInput
            readOnly
            autosize
            minRows={12}
            maxRows={24}
            value={JSON.stringify(
              config,
              null,
              2
            )}
          />
        </Stack>
      </Card>

      <Group grow>
        <Button
          variant="default"
          onClick={() =>
            exportPlan({
              baseConfig:
                config,
              overrides: {},
            })
          }
        >
          Export JSON
        </Button>

        <Button
          onClick={() => {
            loadPlan(
              config,
              {}
            );

            setActiveView(
              "forecast"
            );
          }}
        >
          Generate Forecast
        </Button>
      </Group>
    </Stack>
  );
}