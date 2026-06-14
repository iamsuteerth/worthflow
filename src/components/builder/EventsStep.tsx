import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBolt,
  IconCash,
  IconCreditCard,
  IconPlus,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { formatMonth } from "@/engine/monthFormatting";
import { useBuilderStore } from "@/store/builderStore";
import type { MonthKey } from "@/types/simulation";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";

const TYPE_CONFIG: Record<
  string,
  { color: string; accentColor: string; icon: React.ReactNode }
> = {
  Expense: {
    color: "red",
    accentColor: "var(--mantine-color-red-5)",
    icon: <IconBolt size={16} />,
  },
  "Credit Card": {
    color: "orange",
    accentColor: "var(--mantine-color-orange-5)",
    icon: <IconCreditCard size={16} />,
  },
  Bonus: {
    color: "green",
    accentColor: "var(--mantine-color-green-5)",
    icon: <IconCash size={16} />,
  },
  "Salary Change": {
    color: "blue",
    accentColor: "var(--mantine-color-blue-5)",
    icon: <IconTrendingUp size={16} />,
  },
};

function SectionCard({
  title,
  type,
  children,
}: {
  title: string;
  type: string;
  children: React.ReactNode;
}) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG["Expense"];
  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{ borderLeft: `3px solid ${cfg.accentColor}` }}
    >
      <Group gap="xs" mb="md">
        <ThemeIcon variant="light" color={cfg.color} size="md" radius="md">
          {cfg.icon}
        </ThemeIcon>
        <Text fw={600} size="sm">
          {title}
        </Text>
      </Group>
      <Divider mb="md" />
      {children}
    </Card>
  );
}

export default function EventsStep() {
  const state = useBuilderStore((store) => store.state);
  const addOneOffExpense = useBuilderStore((store) => store.addOneOffExpense);
  const removeOneOffExpense = useBuilderStore((store) => store.removeOneOffExpense);
  const addCreditCardBill = useBuilderStore((store) => store.addCreditCardBill);
  const removeCreditCardBill = useBuilderStore((store) => store.removeCreditCardBill);
  const addBonusIncome = useBuilderStore((store) => store.addBonusIncome);
  const removeBonusIncome = useBuilderStore((store) => store.removeBonusIncome);
  const addSalaryChange = useBuilderStore((store) => store.addSalaryChange);
  const removeSalaryChange = useBuilderStore((store) => store.removeSalaryChange);
  const startMonth = useBuilderStore((s) => s.state.startMonth);

  const [expenseMonth, setExpenseMonth] = useState<MonthKey>(state.startMonth);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);

  const [creditCardMonth, setCreditCardMonth] = useState<MonthKey>(state.startMonth);
  const [creditCardLabel, setCreditCardLabel] = useState("");
  const [creditCardAmount, setCreditCardAmount] = useState(0);

  const [bonusMonth, setBonusMonth] = useState<MonthKey>(state.startMonth);
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusAmount, setBonusAmount] = useState(0);

  const [salaryMonth, setSalaryMonth] = useState<MonthKey>(state.startMonth);
  const [salaryDescription, setSalaryDescription] = useState("");
  const [salaryIncome, setSalaryIncome] = useState(state.monthlyIncome);

  const timeline = useMemo(() => {
    const events = [
      ...state.oneOffExpenses.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Expense",
        description: e.label,
        value: `₹${e.amount.toLocaleString()}`,
      })),
      ...state.creditCardBills.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Credit Card",
        description: e.label,
        value: `₹${e.amount.toLocaleString()}`,
      })),
      ...state.bonusIncome.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Bonus",
        description: e.description,
        value: `₹${e.amount.toLocaleString()}`,
      })),
      ...state.salaryChanges.map((e) => ({
        id: e.id,
        month: e.effectiveMonth,
        type: "Salary Change",
        description: e.description,
        value: `₹${e.newMonthlyIncome.toLocaleString()}/month`,
      })),
    ];
    return events.sort((a, b) => a.month.localeCompare(b.month));
  }, [state.oneOffExpenses, state.bonusIncome, state.salaryChanges, state.creditCardBills]);

  const removeHandlers: Record<string, (id: string) => void> = {
    Expense: removeOneOffExpense,
    "Credit Card": removeCreditCardBill,
    Bonus: removeBonusIncome,
    "Salary Change": removeSalaryChange,
  };

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Events
        </Text>
        <Text size="sm" c="dimmed">
          Add one-off expenses, bonuses, credit card bills, and salary changes over your forecast period.
        </Text>
      </Stack>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="One-Off Expense" type="Expense">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={expenseMonth}
                minMonth={startMonth}
                label="Month"
                onChange={(value) => value && setExpenseMonth(value as MonthKey)}
              />
              <TextInput
                maxLength={50}
                value={expenseLabel}
                label="Label"
                placeholder="e.g. Laptop purchase"
                onChange={(e) => setExpenseLabel(e.currentTarget.value)}
              />
              <NumberInput
                label="Amount"
                value={expenseAmount}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setExpenseAmount(Number(value))}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!expenseLabel.trim() || expenseAmount <= 0}
                onClick={() => {
                  addOneOffExpense({
                    id: crypto.randomUUID(),
                    month: expenseMonth,
                    label: expenseLabel,
                    amount: expenseAmount,
                  });
                  setExpenseLabel("");
                  setExpenseAmount(0);
                }}
              >
                Add Expense
              </Button>
            </Stack>
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Credit Card Bill" type="Credit Card">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={creditCardMonth}
                minMonth={startMonth}
                label="Month"
                onChange={(value) => value && setCreditCardMonth(value as MonthKey)}
              />
              <TextInput
                maxLength={50}
                placeholder="e.g. December bill"
                label="Label"
                value={creditCardLabel}
                onChange={(e) => setCreditCardLabel(e.currentTarget.value)}
              />
              <NumberInput
                label="Amount"
                value={creditCardAmount}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setCreditCardAmount(Number(value))}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!creditCardLabel.trim() || creditCardAmount <= 0}
                onClick={() => {
                  addCreditCardBill({
                    id: crypto.randomUUID(),
                    month: creditCardMonth,
                    amount: creditCardAmount,
                    label: creditCardLabel,
                  });
                  setCreditCardLabel("");
                  setCreditCardAmount(0);
                }}
              >
                Add Bill
              </Button>
            </Stack>
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Bonus Income" type="Bonus">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={bonusMonth}
                minMonth={startMonth}
                label="Month"
                onChange={(value) => value && setBonusMonth(value as MonthKey)}
              />
              <TextInput
                maxLength={50}
                placeholder="e.g. Annual performance bonus"
                label="Description"
                value={bonusDescription}
                onChange={(e) => setBonusDescription(e.currentTarget.value)}
              />
              <NumberInput
                label="Amount"
                value={bonusAmount}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setBonusAmount(Number(value))}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!bonusDescription.trim() || bonusAmount <= 0}
                onClick={() => {
                  addBonusIncome({
                    id: crypto.randomUUID(),
                    month: bonusMonth,
                    amount: bonusAmount,
                    description: bonusDescription,
                  });
                  setBonusDescription("");
                  setBonusAmount(0);
                }}
              >
                Add Bonus
              </Button>
            </Stack>
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Salary Change" type="Salary Change">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={salaryMonth}
                minMonth={startMonth}
                label="Effective Month"
                onChange={(value) => value && setSalaryMonth(value as MonthKey)}
              />
              <TextInput
                maxLength={50}
                label="Description"
                placeholder="e.g. Promotion / role change"
                value={salaryDescription}
                onChange={(e) => setSalaryDescription(e.currentTarget.value)}
              />
              <NumberInput
                label="New Monthly Income"
                value={salaryIncome}
                min={0}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setSalaryIncome(Number(value))}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!salaryDescription.trim() || salaryIncome < 0}
                onClick={() => {
                  addSalaryChange({
                    id: crypto.randomUUID(),
                    effectiveMonth: salaryMonth,
                    newMonthlyIncome: salaryIncome,
                    description: salaryDescription,
                  });
                  setSalaryDescription("");
                }}
              >
                Add Salary Change
              </Button>
            </Stack>
          </SectionCard>
        </Grid.Col>
      </Grid>

      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="sm">
            Event Timeline
          </Text>
          {timeline.length > 0 && (
            <Badge variant="light" color="gray" size="sm">
              {timeline.length} event{timeline.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </Group>

        {timeline.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No events added yet.
          </Text>
        ) : (
          <Table striped highlightOnHover withColumnBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Month</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Value</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {timeline.map((event) => {
                const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG["Expense"];
                return (
                  <Table.Tr key={event.id}>
                    <Table.Td>
                      <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatMonth(event.month)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={cfg.color} size="sm">
                        {event.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{event.description}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Text size="sm" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {event.value}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => removeHandlers[event.type]?.(event.id)}
                      >
                        Remove
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </BuilderStepContainer>
  );
}