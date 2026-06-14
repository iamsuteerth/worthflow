// src/components/builder/ReviewStep.tsx
import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  JsonInput,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBolt,
  IconBuildingBank,
  IconCalendarMonth,
  IconCash,
  IconChartLine,
  IconCoins,
  IconDownload,
  IconPlayerPlay,
  IconWallet,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { builderToConfig } from "@/engine/builderToConfig";
import { exportPlan } from "@/engine/exportPlan";
import { formatMonth } from "@/engine/monthFormatting";
import { useBuilderStore } from "@/store/builderStore";
import { usePlannerStore } from "@/store/plannerStore";

function MetricCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <Card withBorder radius="md" p="md" h="100%">
      <Group justify="space-between" align="flex-start" mb="xs">
        <ThemeIcon variant="light" color={color} size="sm" radius="md">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" style={{ textAlign: "right" }}>
          {label}
        </Text>
      </Group>
      <Text fw={700} size="lg" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Text>
      {sub && (
        <Text size="xs" c="dimmed" mt={2}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

export default function ReviewStep() {
  const state = useBuilderStore((store) => store.state);
  const loadPlan = usePlannerStore((store) => store.loadPlan);
  const setActiveView = usePlannerStore((store) => store.setActiveView);

  const config = useMemo(() => builderToConfig(state), [state]);

  const totalEvents =
    state.oneOffExpenses.length +
    state.bonusIncome.length +
    state.salaryChanges.length +
    state.creditCardBills.length;

  return (
    <Stack maw={800} mx="auto" mt="xl" mb="xl" gap="lg">
      <Stack gap={4}>
        <Text fw={700} size="xl">
          Review & Generate
        </Text>
        <Text size="sm" c="dimmed">
          Check your plan summary before generating the forecast.
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg">
        <Group gap="xs" mb="md">
          <ThemeIcon variant="light" color="indigo" size="md" radius="md">
            <IconChartLine size={16} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            Plan Summary
          </Text>
        </Group>
        <Divider mb="md" />

        <Grid gap="sm">
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Start Month"
              value={formatMonth(state.startMonth)}
              icon={<IconCalendarMonth size={14} />}
              color="blue"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Duration"
              value={`${state.totalMonths} mo`}
              icon={<IconChartLine size={14} />}
              color="violet"
              sub={`${Math.floor(state.totalMonths / 12)} yr${state.totalMonths % 12 > 0 ? ` ${state.totalMonths % 12} mo` : ""}`}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Monthly Income"
              value={`₹${state.monthlyIncome.toLocaleString()}`}
              icon={<IconCash size={14} />}
              color="green"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Monthly Expenses"
              value={`₹${state.defaultMonthlyExpense.toLocaleString()}`}
              icon={<IconBolt size={14} />}
              color="red"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Opening Cash"
              value={`₹${state.openingCash.toLocaleString()}`}
              icon={<IconWallet size={14} />}
              color="cyan"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Opening Portfolio"
              value={`₹${state.openingInvestmentCorpus.toLocaleString()}`}
              icon={<IconCoins size={14} />}
              color="indigo"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Investment Ranges"
              value={String(state.investmentRanges.length)}
              icon={<IconCoins size={14} />}
              color="teal"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Events"
              value={String(totalEvents)}
              icon={<IconBolt size={14} />}
              color="orange"
            />
          </Grid.Col>
        </Grid>

        {state.instruments.length > 0 && (
          <Card withBorder radius="sm" p="sm" mt="sm" bg="gray.0">
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon variant="light" color="teal" size="sm" radius="sm">
                  <IconBuildingBank size={14} />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  Instruments
                </Text>
              </Group>
              <Group gap="xs">
                <Badge variant="light" color="teal" size="sm">
                  {state.instruments.filter((i) => i.type === "FD").length} FD
                </Badge>
                <Badge variant="light" color="violet" size="sm">
                  {state.instruments.filter((i) => i.type === "RD").length} RD
                </Badge>
              </Group>
            </Group>
          </Card>
        )}
      </Card>

      <Card withBorder radius="md" p="lg">
        <Group gap="xs" mb="md">
          <Text fw={600} size="sm">
            Generated Configuration
          </Text>
          <Badge variant="light" color="gray" size="sm">
            JSON
          </Badge>
        </Group>
        <Divider mb="md" />
        <JsonInput
          readOnly
          autosize
          minRows={10}
          maxRows={22}
          value={JSON.stringify(config, null, 2)}
          styles={{
            input: {
              fontFamily: "var(--mantine-font-family-monospace)",
              fontSize: "12px",
            },
          }}
        />
      </Card>

      <Group grow>
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          onClick={() => exportPlan({ baseConfig: config, overrides: {} })}
        >
          Export
        </Button>
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          onClick={() => {
            loadPlan(config, {});
            setActiveView("forecast");
          }}
        >
          Generate Forecast
        </Button>
      </Group>
    </Stack>
  );
}