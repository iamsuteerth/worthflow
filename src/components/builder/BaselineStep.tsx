import { Card, Grid, Group, NumberInput, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconBolt,
  IconCash,
  IconCoins,
  IconWallet,
} from "@tabler/icons-react";
import { useBuilderStore } from "@/store/builderStore";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";

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
            color="green"
            title="Monthly Income"
            description="Take-home salary or primary income."
            accentColor="var(--mantine-color-green-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={1000}
              thousandSeparator=","
              prefix="₹"
              value={state.monthlyIncome}
              onChange={(value) =>
                setBaseline(
                  Number(value),
                  state.openingCash,
                  state.openingInvestmentCorpus,
                  state.defaultMonthlyExpense
                )
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
                setBaseline(
                  state.monthlyIncome,
                  state.openingCash,
                  state.openingInvestmentCorpus,
                  Number(value)
                )
              }
            />
          </FieldCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <FieldCard
            icon={<IconWallet size={16} />}
            color="blue"
            title="Opening Cash Balance"
            description="Cash or savings in bank accounts today."
            accentColor="var(--mantine-color-blue-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={0}
              thousandSeparator=","
              prefix="₹"
              value={state.openingCash}
              onChange={(value) =>
                setBaseline(
                  state.monthlyIncome,
                  Number(value),
                  state.openingInvestmentCorpus,
                  state.defaultMonthlyExpense
                )
              }
            />
          </FieldCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <FieldCard
            icon={<IconCoins size={16} />}
            color="violet"
            title="Opening Investment Corpus"
            description="Existing mutual funds, stocks, or other investments."
            accentColor="var(--mantine-color-violet-5)"
          >
            <NumberInput
              label="Amount"
              required
              min={0}
              thousandSeparator=","
              prefix="₹"
              value={state.openingInvestmentCorpus}
              onChange={(value) =>
                setBaseline(
                  state.monthlyIncome,
                  state.openingCash,
                  Number(value),
                  state.defaultMonthlyExpense
                )
              }
            />
          </FieldCard>
        </Grid.Col>
      </Grid>

      {state.monthlyIncome > 0 && state.defaultMonthlyExpense >= 0 && (
        <Card withBorder radius="md" p="md" bg={monthlySurplus >= 0 ? "green.0" : "red.0"}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Monthly surplus after expenses
            </Text>
            <Text
              fw={700}
              size="sm"
              c={monthlySurplus >= 0 ? "green.7" : "red.7"}
            >
              {monthlySurplus >= 0 ? "+" : ""}₹
              {monthlySurplus.toLocaleString()}
            </Text>
          </Group>
        </Card>
      )}
    </BuilderStepContainer>
  );
}