import type { MonthKey } from "@/types/simulation";

import { Card, Grid, NumberInput, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCalendarMonth, IconChartLine } from "@tabler/icons-react";

import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";
import { useBuilderStore } from "@/store/builderStore";

export default function ForecastStep() {
  const state = useBuilderStore((store) => store.state);
  const setForecast = useBuilderStore((store) => store.setForecast);

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Forecast Timeline
        </Text>
        <Text size="sm" c="dimmed">
          Set the start date and how far ahead you want to project your finances.
        </Text>
      </Stack>

      <Grid gap="md">
        <Grid.Col span={12}>
          <Card
            withBorder
            radius="md"
            p="lg"
            style={{ borderLeft: "3px solid var(--mantine-color-brand-5)" }}
          >
            <Stack gap="xs" mb="md">
              <ThemeIcon variant="light" color="brand" size="md" radius="md">
                <IconCalendarMonth size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Start Month
              </Text>
              <Text size="xs" c="dimmed">
                The first month of your forecast period.
              </Text>
            </Stack>
            <BuilderMonthSelect
              label="Forecast Start Month"
              value={state.startMonth}
              onChange={(value: string | null) => {
                if (!value) return;
                setForecast(value as MonthKey, state.totalMonths);
              }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card
            withBorder
            radius="md"
            p="lg"
            style={{ borderLeft: "3px solid var(--mantine-color-violet-5)" }}
          >
            <Stack gap="xs" mb="md">
              <ThemeIcon variant="light" color="violet" size="md" radius="md">
                <IconChartLine size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Horizon
              </Text>
              <Text size="xs" c="dimmed">
                How many months to project forward (12–48).
              </Text>
            </Stack>
            <NumberInput
              label="Forecast Horizon (Months)"
              value={state.totalMonths}
              min={12}
              max={48}
              allowDecimal={false}
              onChange={(value) =>
                setForecast(state.startMonth, Number(value))
              }
            />
            {state.totalMonths >= 12 && (
              <Text size="xs" c="dimmed" mt="xs">
                {Math.floor(state.totalMonths / 12)} yr
                {state.totalMonths % 12 > 0
                  ? ` ${state.totalMonths % 12} mo`
                  : ""}
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </BuilderStepContainer>
  );
}