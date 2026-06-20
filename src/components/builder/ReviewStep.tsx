import {
  Alert,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBolt,
  IconBuildingBank,
  IconCalendarEvent,
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
import { money } from "@/format/money";
import { exportPlan } from "@/engine/exportPlan";
import { formatMonth } from "@/engine/monthFormatting";
import { useBuilderStore } from "@/store/builderStore";
import { usePlannerStore } from "@/store/plannerStore";
import { useCloudStore, defaultPlanLabel } from "@/store/cloudStore";
import {
  notifyCloudSaved,
  notifyCloudAutoSaveFailed,
  notifyGeneratedNudge,
} from "@/lib/cloudNotifications";

// Uniform summary card: icon + label on the top row, value below. Nothing else.
function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card withBorder radius="md" p="md" h="100%">
      <Group gap="xs" wrap="nowrap" mb="xs">
        <ThemeIcon variant="light" color={color} size="sm" radius="md">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em" }}>
          {label}
        </Text>
      </Group>
      <Text fw={700} size="lg" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Text>
    </Card>
  );
}

export default function ReviewStep() {
  const state = useBuilderStore((store) => store.state);
  const loadGeneratedPlan = usePlannerStore((store) => store.loadGeneratedPlan);
  const setActiveView = usePlannerStore((store) => store.setActiveView);
  const saveCount = useCloudStore((s) => s.saves.length);
  const initialLoadFailed = useCloudStore((s) => s.initialLoadFailed);
  const willAutoSave = saveCount === 0 && !initialLoadFailed;

  const config = useMemo(() => builderToConfig(state), [state]);

  // Every category addable in the Events step counts as an event.
  const totalEvents =
    state.oneOffExpenses.length +
    state.creditCardBills.length +
    state.recurringExpenses.length +
    state.bonusIncome.length +
    state.salaryChanges.length;

  const metrics = [
    { label: "Start Month", value: formatMonth(state.startMonth), icon: <IconCalendarMonth size={14} />, color: "brand" },
    { label: "Duration", value: `${state.totalMonths} mo`, icon: <IconChartLine size={14} />, color: "violet" },
    { label: "Monthly Income", value: money(state.monthlyIncome), icon: <IconCash size={14} />, color: "teal" },
    { label: "Monthly Expenses", value: money(state.defaultMonthlyExpense), icon: <IconBolt size={14} />, color: "red" },
    { label: "Opening Cash", value: money(state.openingCash), icon: <IconWallet size={14} />, color: "brand" },
    { label: "Investment Accounts", value: String(state.investmentAccounts.length), icon: <IconCoins size={14} />, color: "violet" },
    { label: "Instruments", value: String(state.instruments.length), icon: <IconBuildingBank size={14} />, color: "cyan" },
    { label: "Events", value: String(totalEvents), icon: <IconCalendarEvent size={14} />, color: "gray" },
  ];

  async function handleGenerate() {
    loadGeneratedPlan(config);
    setActiveView("forecast");

    const { saves, initialLoadFailed, uploadCurrentPlan } = useCloudStore.getState();

    if (!initialLoadFailed && saves.length === 0) {
      try {
        await uploadCurrentPlan(defaultPlanLabel());
        notifyCloudSaved(useCloudStore.getState().saves.length);
      } catch {
        notifyCloudAutoSaveFailed();
      }
    } else {
      notifyGeneratedNudge();
    }
  }

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

      <Alert color="brand" variant="light" radius="md">
        {willAutoSave
          ? "Generating creates your forecast and saves it to the cloud automatically."
          : "Generating creates a new plan. Save it to a cloud slot to keep it — your existing saves aren't changed."}
      </Alert>

      <Card withBorder radius="md" p="lg">
        <Group gap="xs" mb="md">
          <ThemeIcon variant="light" color="brand" size="md" radius="md">
            <IconChartLine size={16} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            Plan Summary
          </Text>
        </Group>
        <Divider mb="md" />

        <Grid gap="sm">
          {metrics.map((metric) => (
            <Grid.Col key={metric.label} span={{ base: 6, md: 3 }}>
              <MetricCard {...metric} />
            </Grid.Col>
          ))}
        </Grid>
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
          onClick={handleGenerate}
        >
          Generate Forecast
        </Button>
      </Group>
    </Stack>
  );
}
