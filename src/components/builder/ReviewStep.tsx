import {
  Alert,
  Badge,
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
        <Text size="xs" c="dimmed" fw={500} tt="uppercase" ta="right" style={{ letterSpacing: "0.04em" }}>
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
  const loadGeneratedPlan = usePlannerStore((store) => store.loadGeneratedPlan);
  const setActiveView = usePlannerStore((store) => store.setActiveView);
  const saveCount = useCloudStore((s) => s.saves.length);
  const initialLoadFailed = useCloudStore((s) => s.initialLoadFailed);
  const willAutoSave = saveCount === 0 && !initialLoadFailed;

  const config = useMemo(() => builderToConfig(state), [state]);

  const totalEvents =
    state.oneOffExpenses.length +
    state.bonusIncome.length +
    state.salaryChanges.length +
    state.creditCardBills.length;

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
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Start Month"
              value={formatMonth(state.startMonth)}
              icon={<IconCalendarMonth size={14} />}
              color="brand"
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
              value={money(state.monthlyIncome)}
              icon={<IconCash size={14} />}
              color="teal"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Monthly Expenses"
              value={money(state.defaultMonthlyExpense)}
              icon={<IconBolt size={14} />}
              color="red"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Opening Cash"
              value={money(state.openingCash)}
              icon={<IconWallet size={14} />}
              color="brand"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Investment Accounts"
              value={String(state.investmentAccounts.length)}
              icon={<IconCoins size={14} />}
              color="violet"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <MetricCard
              label="Events"
              value={String(totalEvents)}
              icon={<IconBolt size={14} />}
              color="gray"
            />
          </Grid.Col>
        </Grid>

        {state.instruments.length > 0 && (
          <Card withBorder radius="sm" p="sm" mt="sm" style={{ background: "var(--mantine-color-default-hover)" }}>
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon variant="light" color="gray" size="sm" radius="sm">
                  <IconBuildingBank size={14} />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  Instruments
                </Text>
              </Group>
              <Group gap="xs">
                <Badge variant="light" color="cyan" size="sm">
                  {state.instruments.filter((i) => i.type === "FD").length} FD
                </Badge>
                <Badge variant="light" color="grape" size="sm">
                  {state.instruments.filter((i) => i.type === "RD").length} RD
                </Badge>
              </Group>
            </Group>
          </Card>
        )}
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
