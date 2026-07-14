import { Card, Grid, Group, NumberInput, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconBolt, IconCash, IconWallet } from "@tabler/icons-react";

import BuilderStepContainer from "@/components/builder/BuilderStepContainer";
import { moneySigned } from "@/format/money";
import { useBuilderStore } from "@/store/builderStore";

function FieldCard({
  icon,
  color,
  title,
  description,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      h="100%"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <Stack gap="xs" mb="md">
        <ThemeIcon variant="light" color={color} size="md" radius="md">
          {icon}
        </ThemeIcon>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
      {children}
    </Card>
  );
}

export default function BaselineStep() {
  const state = useBuilderStore((store) => store.state);
  const setBaseline = useBuilderStore((store) => store.setBaseline);

  const monthlySurplus = state.monthlyIncome - state.defaultMonthlyExpense;

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Financial Baseline
        </Text>
        <Text size="sm" c="dimmed">
          Your current income, spending, and starting balances.
        </Text>
      </Stack>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <FieldCard
            icon={<IconCash size={16} />}
            color="teal"
            title="Monthly Income"
            description="Take-home salary or primary income."
            accentColor="var(--mantine-color-teal-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={1000}
              thousandSeparator=","
              prefix="₹"
              value={state.monthlyIncome}
              onChange={(value) =>
                setBaseline(Number(value), state.openingCash, state.defaultMonthlyExpense)
              }
            />
          </FieldCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <FieldCard
            icon={<IconBolt size={16} />}
            color="red"
            title="Monthly Expenses"
            description="Regular recurring spend each month."
            accentColor="var(--mantine-color-red-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={0}
              thousandSeparator=","
              prefix="₹"
              value={state.defaultMonthlyExpense}
              onChange={(value) =>
                setBaseline(state.monthlyIncome, state.openingCash, Number(value))
              }
            />
          </FieldCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <FieldCard
            icon={<IconWallet size={16} />}
            color="brand"
            title="Opening Cash Balance"
            description="Cash or savings in bank accounts today."
            accentColor="var(--mantine-color-brand-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={0}
              thousandSeparator=","
              prefix="₹"
              value={state.openingCash}
              onChange={(value) =>
                setBaseline(state.monthlyIncome, Number(value), state.defaultMonthlyExpense)
              }
            />
          </FieldCard>
        </Grid.Col>
      </Grid>

      {state.monthlyIncome > 0 && state.defaultMonthlyExpense >= 0 && (
        <Card withBorder radius="md" p="md" bg={monthlySurplus >= 0 ? "teal.0" : "red.0"}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Monthly surplus after expenses</Text>
            <Text fw={700} size="sm" c={monthlySurplus >= 0 ? "teal.7" : "red.7"} style={{ fontVariantNumeric: "tabular-nums" }}>
              {moneySigned(monthlySurplus)}
            </Text>
          </Group>
        </Card>
      )}
    </BuilderStepContainer>
  );
}