import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconChartLine, IconPlus, IconTrash, IconTrendingUp } from "@tabler/icons-react";
import { useState } from "react";
import { nextMonth } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { useBuilderStore } from "@/store/builderStore";
import type { MonthKey } from "@/types/simulation";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";

export default function InvestmentsStep() {
  const state = useBuilderStore((store) => store.state);
  const addInvestmentRange = useBuilderStore((store) => store.addInvestmentRange);
  const removeInvestmentRange = useBuilderStore((store) => store.removeInvestmentRange);
  const setState = useBuilderStore((store) => store.setState);

  const startMonth =
    state.investmentRanges.length === 0
      ? state.startMonth
      : (nextMonth(
          state.investmentRanges[state.investmentRanges.length - 1].endMonth
        ) as MonthKey);

  const [endMonth, setEndMonth] = useState<MonthKey>(state.startMonth);
  const [amount, setAmount] = useState(0);

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Monthly Investments
        </Text>
        <Text size="sm" c="dimmed">
          Define how much you invest each month. Add continuous ranges — use ₹0 for pause periods.
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg" style={{ borderLeft: "3px solid var(--mantine-color-indigo-5)" }}>
        <Stack gap="xs" mb="md">
          <ThemeIcon variant="light" color="indigo" size="md" radius="md">
            <IconTrendingUp size={16} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            Default Annual Return
          </Text>
          <Text size="xs" c="dimmed">
            Applied to all months without a specific return override.
          </Text>
        </Stack>
        <NumberInput
          label="Return rate (%)"
          value={state.defaultAnnualReturn}
          min={-99.99}
          max={100}
          decimalScale={2}
          suffix="%"
          onChange={(value) =>
            setState({ defaultAnnualReturn: Number(value) })
          }
        />
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon variant="light" color="violet" size="md" radius="md">
                <IconChartLine size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Add Investment Range
              </Text>
            </Group>
            <Badge variant="light" color="gray" size="sm">
              Starts: {formatMonth(startMonth)}
            </Badge>
          </Group>

          <Divider />

          <Grid gap="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <BuilderMonthSelect
                value={endMonth}
                label="End Month"
                onChange={(value: string | null) => {
                  if (!value) return;
                  setEndMonth(value as MonthKey);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Monthly Investment"
                value={amount}
                min={0}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setAmount(Number(value))}
              />
            </Grid.Col>
          </Grid>

          <Button
            leftSection={<IconPlus size={16} />}
            disabled={amount < 0 || startMonth > endMonth}
            onClick={() => {
              addInvestmentRange({ startMonth, endMonth, amount });
              const nextStart = nextMonth(endMonth) as MonthKey;
              setEndMonth(nextStart);
              setAmount(0);
            }}
          >
            Add Range
          </Button>
        </Stack>
      </Card>

      {state.investmentRanges.length > 0 && (
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="green" size="md" radius="md">
                <IconChartLine size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Investment Ranges
              </Text>
              <Badge variant="light" color="green" size="sm">
                {state.investmentRanges.length} range{state.investmentRanges.length !== 1 ? "s" : ""}
              </Badge>
            </Group>

            <Divider />

            <Stack gap="xs">
              {state.investmentRanges.map((range, index) => (
                <Card key={index} withBorder radius="sm" p="sm" bg="gray.0">
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text size="sm" fw={600}>
                        {formatMonth(range.startMonth)} → {formatMonth(range.endMonth)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        ₹{range.amount.toLocaleString()} / month
                      </Text>
                    </Stack>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => removeInvestmentRange(index)}
                    >
                      Remove
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {state.investmentRanges.length === 0 && (
        <Card withBorder radius="md" p="xl" style={{ borderStyle: "dashed" }}>
          <Stack align="center" gap="xs">
            <ThemeIcon variant="light" color="gray" size="xl" radius="md">
              <IconChartLine size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" ta="center">
              No investment ranges added yet. Add your first range above.
            </Text>
          </Stack>
        </Card>
      )}
    </BuilderStepContainer>
  );
}