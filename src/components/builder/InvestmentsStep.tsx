// src/components/builder/InvestmentsStep.tsx
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
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { IconChartLine, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { formatMonth } from "@/engine/monthFormatting";
import { useBuilderStore } from "@/store/builderStore";
import type { MonthKey } from "@/types/simulation";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";

export default function InvestmentsStep() {
  const state = useBuilderStore((store) => store.state);
  const addInvestmentAccount = useBuilderStore((store) => store.addInvestmentAccount);
  const removeInvestmentAccount = useBuilderStore((store) => store.removeInvestmentAccount);

  const [name, setName] = useState("");
  const [startMonth, setStartMonth] = useState<MonthKey>(state.startMonth);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [defaultMonthlyContribution, setDefaultMonthlyContribution] = useState(0);
  const [defaultAnnualReturn, setDefaultAnnualReturn] = useState(0);

  const canAdd =
    name.trim().length > 0 && (openingBalance > 0 || defaultMonthlyContribution > 0);

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Investment Accounts
        </Text>
        <Text size="sm" c="dimmed">
          Every investment • Existing Portfolios, SIPs, or future lump sums are an account. 
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="indigo" size="md" radius="md">
              <IconChartLine size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Add Account
            </Text>
          </Group>

          <Divider />

          <Grid gap="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Account Name"
                placeholder="e.g. Nifty 50, Emergency Fund"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <BuilderMonthSelect
                value={startMonth}
                label="Start Month"
                minMonth={state.startMonth}
                onChange={(value) => {
                  if (!value) return;
                  setStartMonth(value as MonthKey);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Opening Balance"
                value={openingBalance}
                min={0}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setOpeningBalance(Number(value))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Default Monthly Contribution"
                value={defaultMonthlyContribution}
                min={0}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setDefaultMonthlyContribution(Number(value))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Default Annual Return"
                value={defaultAnnualReturn}
                min={-99.99}
                max={1000}
                decimalScale={2}
                suffix="%"
                onChange={(value) => setDefaultAnnualReturn(Number(value))}
              />
            </Grid.Col>
          </Grid>

          <Button
            leftSection={<IconPlus size={16} />}
            disabled={!canAdd}
            onClick={() => {
              addInvestmentAccount({
                name: name.trim(),
                startMonth,
                openingBalance,
                defaultAnnualReturn,
                defaultMonthlyContribution,
              });
              setName("");
              setStartMonth(state.startMonth);
              setOpeningBalance(0);
              setDefaultMonthlyContribution(0);
              setDefaultAnnualReturn(0);
            }}
          >
            Add Account
          </Button>
        </Stack>
      </Card>

      {state.investmentAccounts.length > 0 && (
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="green" size="md" radius="md">
                <IconChartLine size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Investment Accounts
              </Text>
              <Badge variant="light" color="green" size="sm">
                {state.investmentAccounts.length} account
                {state.investmentAccounts.length !== 1 ? "s" : ""}
              </Badge>
            </Group>

            <Divider />

            <Stack gap="xs">
              {state.investmentAccounts.map((account) => (
                <Card key={account.id} withBorder radius="sm" p="sm" bg="gray.0">
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text size="sm" fw={600}>
                        {account.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Starts {formatMonth(account.startMonth)} · Opening ₹
                        {account.openingBalance.toLocaleString()} · Contribution ₹
                        {account.defaultMonthlyContribution.toLocaleString()}/mo · Return{" "}
                        {account.defaultAnnualReturn}%
                      </Text>
                    </Stack>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => removeInvestmentAccount(account.id)}
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

      {state.investmentAccounts.length === 0 && (
        <Card withBorder radius="md" p="xl" style={{ borderStyle: "dashed" }}>
          <Stack align="center" gap="xs">
            <ThemeIcon variant="light" color="gray" size="xl" radius="md">
              <IconChartLine size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" ta="center">
              No investment accounts added yet. Add your first account above.
            </Text>
          </Stack>
        </Card>
      )}
    </BuilderStepContainer>
  );
}
