import {
  Alert,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  List,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
import type { RuntimeEvent } from "@/types/runtimeEvent";

// Generating a plan resets the override layer (loadGeneratedPlan clears overrides and
// saved scenarios). The builder carries the baseline forward, so this lists only what
// is actually discarded: Scenario Lab what-if events and saved scenarios.
function summarizeDroppedScenarioData(
  events: RuntimeEvent[],
  savedScenarioCount: number
): string[] {
  const count = (types: RuntimeEvent["type"][]) =>
    events.filter((e) => types.includes(e.type)).length;
  const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;

  const items: string[] = [];
  const spend = count(["SPENDING_OVERRIDE"]);
  const inv = count(["ACCOUNT_AMOUNT_OVERRIDE", "ACCOUNT_RETURN_OVERRIDE"]);
  const flows = count(["INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL"]);
  const instruments = count(["FD", "RD"]);
  const income = count(["BONUS_INCOME", "SALARY_CHANGE"]);
  const expenses = count(["ONE_OFF_EXPENSE", "CREDIT_CARD_EXPENSE", "RECURRING_EXPENSE"]);
  const cash = count(["OPENING_CASH_OVERRIDE"]);

  if (spend) items.push(plural(spend, "spending override"));
  if (inv) items.push(plural(inv, "investment override"));
  if (flows) items.push(plural(flows, "deposit / withdrawal"));
  if (instruments) items.push(plural(instruments, "what-if FD/RD"));
  if (income) items.push(plural(income, "income change"));
  if (expenses) items.push(plural(expenses, "one-off / recurring expense"));
  if (cash) items.push("opening cash override");
  if (savedScenarioCount) items.push(plural(savedScenarioCount, "saved scenario"));
  return items;
}

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
  const overrides = usePlannerStore((store) => store.overrides);
  const savedScenarios = usePlannerStore((store) => store.savedScenarios);
  const saveCount = useCloudStore((s) => s.saves.length);
  const initialLoadFailed = useCloudStore((s) => s.initialLoadFailed);
  const willAutoSave = saveCount === 0 && !initialLoadFailed;

  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  // What the active plan's override layer would lose on regeneration. Only present
  // once the user has built up Scenario Lab changes — i.e. on a 2nd+ plan.
  const droppedItems = useMemo(
    () => summarizeDroppedScenarioData(overrides.runtimeEvents ?? [], savedScenarios.length),
    [overrides.runtimeEvents, savedScenarios.length]
  );

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
          onClick={() => (droppedItems.length > 0 ? openConfirm() : handleGenerate())}
        >
          Generate Forecast
        </Button>
      </Group>

      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title="Generate a new plan?"
        centered
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm">
            Generating rebuilds the plan from your baseline. These Scenario Lab changes on
            the current plan will be <Text span fw={700}>discarded</Text>:
          </Text>
          <List size="sm" spacing={4}>
            {droppedItems.map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List>
          <Text size="xs" c="dimmed">
            Your accounts, instruments, and baseline figures are kept. Export or save the
            current plan first if you want to keep these changes.
          </Text>
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              leftSection={<IconPlayerPlay size={14} />}
              onClick={async () => {
                closeConfirm();
                await handleGenerate();
              }}
            >
              Discard & Generate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
