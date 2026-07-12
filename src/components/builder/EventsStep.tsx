import type { MonthKey } from "@/types/simulation";

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";

import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBolt,
  IconCash,
  IconCreditCard,
  IconPencil,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";

import { useMemo, useState } from "react";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { getMaxAnnualYears, deriveAnnualEndMonth } from "@/engine/annualExpense";
import { findOutOfWindowItems } from "@/engine/builderWindow";
import { forecastEndMonth } from "@/engine/dateUtils";

// Recover "How many times?" (the charge count) from a stored annual range for editing.
function annualYearsFromRange(start: MonthKey, end: MonthKey): number {
  const [ay, am] = start.split("-").map(Number);
  const [by, bm] = end.split("-").map(Number);
  return Math.max(1, Math.floor(((by - ay) * 12 + (bm - am)) / 12) + 1);
}
import { useBuilderStore } from "@/store/builderStore";
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
  Recurring: {
    color: "red",
    accentColor: "var(--mantine-color-red-4)",
    icon: <IconRepeat size={16} />,
  },
  "Credit Card": {
    color: "orange",
    accentColor: "var(--mantine-color-orange-5)",
    icon: <IconCreditCard size={16} />,
  },
  Bonus: {
    color: "teal",
    accentColor: "var(--mantine-color-teal-5)",
    icon: <IconCash size={16} />,
  },
  "Salary Change": {
    color: "brand",
    accentColor: "var(--mantine-color-brand-5)",
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
  const addOneOffExpense      = useBuilderStore((store) => store.addOneOffExpense);
  const removeOneOffExpense   = useBuilderStore((store) => store.removeOneOffExpense);
  const addCreditCardBill     = useBuilderStore((store) => store.addCreditCardBill);
  const removeCreditCardBill  = useBuilderStore((store) => store.removeCreditCardBill);
  const addBonusIncome        = useBuilderStore((store) => store.addBonusIncome);
  const removeBonusIncome     = useBuilderStore((store) => store.removeBonusIncome);
  const addSalaryChange       = useBuilderStore((store) => store.addSalaryChange);
  const removeSalaryChange    = useBuilderStore((store) => store.removeSalaryChange);
  const addRecurringExpense   = useBuilderStore((store) => store.addRecurringExpense);
  const removeRecurringExpense = useBuilderStore((store) => store.removeRecurringExpense);
  const updateOneOffExpense    = useBuilderStore((store) => store.updateOneOffExpense);
  const updateCreditCardBill   = useBuilderStore((store) => store.updateCreditCardBill);
  const updateBonusIncome      = useBuilderStore((store) => store.updateBonusIncome);
  const updateSalaryChange     = useBuilderStore((store) => store.updateSalaryChange);
  const updateRecurringExpense = useBuilderStore((store) => store.updateRecurringExpense);

  const [editingId, setEditingId] = useState<string | null>(null);

  const startMonth = useBuilderStore((s) => s.state.startMonth);
  const forecastEnd = forecastEndMonth(state.startMonth, state.totalMonths);

  const [expenseMonth, setExpenseMonth]   = useState<MonthKey>(state.startMonth);
  const [expenseLabel, setExpenseLabel]   = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);

  const [creditCardMonth, setCreditCardMonth]   = useState<MonthKey>(state.startMonth);
  const [creditCardLabel, setCreditCardLabel]   = useState("");
  const [creditCardAmount, setCreditCardAmount] = useState(0);

  const [recurringName, setRecurringName]         = useState("");
  const [recurringAmount, setRecurringAmount]     = useState(0);
  const [recurringStart, setRecurringStart]       = useState<MonthKey>(state.startMonth);
  const [recurringEnd, setRecurringEnd]           = useState<MonthKey>(state.startMonth);
  const [recurringYears, setRecurringYears]       = useState(1);
  const [recurringFrequency, setRecurringFrequency] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  const recurringMaxYears = getMaxAnnualYears(state.startMonth, state.totalMonths, recurringStart);

  const [bonusMonth, setBonusMonth]           = useState<MonthKey>(state.startMonth);
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusAmount, setBonusAmount]         = useState(0);

  const [salaryMonth, setSalaryMonth]           = useState<MonthKey>(state.startMonth);
  const [salaryDescription, setSalaryDescription] = useState("");
  const [salaryIncome, setSalaryIncome]         = useState(state.monthlyIncome);

  const editingOneOff    = state.oneOffExpenses.find((e) => e.id === editingId);
  const editingCc        = state.creditCardBills.find((b) => b.id === editingId);
  const editingRecurring = state.recurringExpenses.find((r) => r.id === editingId);
  const editingBonus     = state.bonusIncome.find((b) => b.id === editingId);
  const editingSalary    = state.salaryChanges.find((s) => s.id === editingId);

  const oowIds = useMemo(() => new Set(findOutOfWindowItems(state).map((i) => i.id)), [state]);

  function resetOneOff() {
    if (editingOneOff) setEditingId(null);
    setExpenseMonth(state.startMonth); setExpenseLabel(""); setExpenseAmount(0);
  }
  function submitOneOff() {
    const payload = { month: expenseMonth, label: expenseLabel, amount: expenseAmount };
    if (editingOneOff) updateOneOffExpense({ id: editingOneOff.id, ...payload });
    else addOneOffExpense({ id: crypto.randomUUID(), ...payload });
    resetOneOff();
  }

  function resetCc() {
    if (editingCc) setEditingId(null);
    setCreditCardMonth(state.startMonth); setCreditCardLabel(""); setCreditCardAmount(0);
  }
  function submitCc() {
    const payload = { month: creditCardMonth, amount: creditCardAmount, label: creditCardLabel };
    if (editingCc) updateCreditCardBill({ id: editingCc.id, ...payload });
    else addCreditCardBill({ id: crypto.randomUUID(), ...payload });
    resetCc();
  }

  function resetBonus() {
    if (editingBonus) setEditingId(null);
    setBonusMonth(state.startMonth); setBonusDescription(""); setBonusAmount(0);
  }
  function submitBonus() {
    const payload = { month: bonusMonth, amount: bonusAmount, description: bonusDescription };
    if (editingBonus) updateBonusIncome({ id: editingBonus.id, ...payload });
    else addBonusIncome({ id: crypto.randomUUID(), ...payload });
    resetBonus();
  }

  function resetSalary() {
    if (editingSalary) setEditingId(null);
    setSalaryMonth(state.startMonth); setSalaryDescription(""); setSalaryIncome(state.monthlyIncome);
  }
  function submitSalary() {
    const payload = { effectiveMonth: salaryMonth, newMonthlyIncome: salaryIncome, description: salaryDescription };
    if (editingSalary) updateSalaryChange({ id: editingSalary.id, ...payload });
    else addSalaryChange({ id: crypto.randomUUID(), ...payload });
    resetSalary();
  }

  function resetRecurring() {
    if (editingRecurring) setEditingId(null);
    setRecurringName(""); setRecurringAmount(0);
    setRecurringStart(state.startMonth); setRecurringEnd(state.startMonth);
    setRecurringYears(1); setRecurringFrequency("MONTHLY");
  }
  function submitRecurring() {
    const resolvedEndMonth =
      recurringFrequency === "ANNUAL" ? deriveAnnualEndMonth(recurringStart, recurringYears) : recurringEnd;
    const payload = {
      name: recurringName.trim(), amount: recurringAmount,
      startMonth: recurringStart, endMonth: resolvedEndMonth, frequency: recurringFrequency,
    };
    if (editingRecurring) updateRecurringExpense({ id: editingRecurring.id, ...payload });
    else addRecurringExpense({ id: crypto.randomUUID(), ...payload });
    resetRecurring();
  }

  function startEdit(event: { id: string; type: string }) {
    setEditingId(event.id);
    if (event.type === "Expense") {
      const e = state.oneOffExpenses.find((x) => x.id === event.id);
      if (e) { setExpenseMonth(e.month); setExpenseLabel(e.label); setExpenseAmount(e.amount); }
    } else if (event.type === "Credit Card") {
      const b = state.creditCardBills.find((x) => x.id === event.id);
      if (b) { setCreditCardMonth(b.month); setCreditCardLabel(b.label); setCreditCardAmount(b.amount); }
    } else if (event.type === "Recurring") {
      const r = state.recurringExpenses.find((x) => x.id === event.id);
      if (r) {
        setRecurringName(r.name); setRecurringAmount(r.amount); setRecurringStart(r.startMonth);
        setRecurringFrequency(r.frequency ?? "MONTHLY");
        if ((r.frequency ?? "MONTHLY") === "ANNUAL") setRecurringYears(annualYearsFromRange(r.startMonth, r.endMonth));
        else setRecurringEnd(r.endMonth);
      }
    } else if (event.type === "Bonus") {
      const b = state.bonusIncome.find((x) => x.id === event.id);
      if (b) { setBonusMonth(b.month); setBonusDescription(b.description); setBonusAmount(b.amount); }
    } else if (event.type === "Salary Change") {
      const s = state.salaryChanges.find((x) => x.id === event.id);
      if (s) { setSalaryMonth(s.effectiveMonth); setSalaryDescription(s.description); setSalaryIncome(s.newMonthlyIncome); }
    }
  }

  const timeline = useMemo(() => {
    const events = [
      ...state.oneOffExpenses.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Expense",
        description: e.label,
        value: money(e.amount),
      })),
      ...state.creditCardBills.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Credit Card",
        description: e.label,
        value: money(e.amount),
      })),
      ...(state.recurringExpenses ?? []).map((e) => ({
        id: e.id,
        month: e.startMonth,
        type: "Recurring",
        description: `${e.name} (→ ${formatMonth(e.endMonth)})${e.frequency === "ANNUAL" ? " · Annual" : ""}`,
        value: e.frequency === "ANNUAL" ? `${money(e.amount)}/yr` : `${money(e.amount)}/mo`,
      })),
      ...state.bonusIncome.map((e) => ({
        id: e.id,
        month: e.month,
        type: "Bonus",
        description: e.description,
        value: money(e.amount),
      })),
      ...state.salaryChanges.map((e) => ({
        id: e.id,
        month: e.effectiveMonth,
        type: "Salary Change",
        description: e.description,
        value: `${money(e.newMonthlyIncome)}/month`,
      })),
    ];
    return events.sort((a, b) => a.month.localeCompare(b.month));
  }, [
    state.oneOffExpenses,
    state.bonusIncome,
    state.salaryChanges,
    state.creditCardBills,
    state.recurringExpenses,
  ]);

  const removeHandlers: Record<string, (id: string) => void> = {
    Expense:       removeOneOffExpense,
    "Credit Card": removeCreditCardBill,
    Bonus:         removeBonusIncome,
    "Salary Change": removeSalaryChange,
    Recurring:     removeRecurringExpense,
  };

  const recurringValid =
    recurringName.trim().length > 0 &&
    recurringAmount > 0 &&
    (recurringFrequency === "ANNUAL"
      ? recurringYears >= 1 && recurringYears <= recurringMaxYears
      : recurringStart <= recurringEnd);

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Events
        </Text>
        <Text size="sm" c="dimmed">
          Add one-off expenses, recurring obligations, bonuses, credit card bills, and salary changes.
        </Text>
      </Stack>

      <Grid gap="md">
        {/* ── One-Off Expense ── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="One-Off Expense" type="Expense">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={expenseMonth}
                minMonth={startMonth}
                maxMonth={forecastEnd}
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
              <Group gap="xs">
                <Button
                  leftSection={editingOneOff ? <IconPencil size={16} /> : <IconPlus size={16} />}
                  disabled={!expenseLabel.trim() || expenseAmount <= 0}
                  onClick={submitOneOff}
                >
                  {editingOneOff ? "Save Changes" : "Add Expense"}
                </Button>
                {editingOneOff && (
                  <Button variant="default" leftSection={<IconX size={16} />} onClick={resetOneOff}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>

        {/* ── Recurring Expense ── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Recurring Expense" type="Recurring">
            <Stack gap="sm">
              <TextInput
                maxLength={50}
                label="Name"
                placeholder="e.g. Netflix, Rent, EMI"
                value={recurringName}
                onChange={(e) => setRecurringName(e.currentTarget.value)}
              />
              <NumberInput
                label={recurringFrequency === "ANNUAL" ? "Annual Amount" : "Monthly Amount"}
                value={recurringAmount}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(value) => setRecurringAmount(Number(value))}
              />
              <SegmentedControl
                value={recurringFrequency}
                onChange={(value) => setRecurringFrequency(value as "MONTHLY" | "ANNUAL")}
                data={[
                  { label: "Monthly", value: "MONTHLY" },
                  { label: "Annual", value: "ANNUAL" },
                ]}
              />
              <BuilderMonthSelect
                value={recurringStart}
                minMonth={startMonth}
                maxMonth={forecastEnd}
                label="Start Month"
                onChange={(value) => value && setRecurringStart(value as MonthKey)}
              />
              {recurringFrequency === "ANNUAL" ? (
                <NumberInput
                  label="How many times?"
                  description="Charged once a year on this month's anniversary"
                  value={recurringYears}
                  min={1}
                  max={Math.max(recurringMaxYears, 1)}
                  onChange={(value) => setRecurringYears(Number(value))}
                />
              ) : (
                <BuilderMonthSelect
                  value={recurringEnd}
                  minMonth={recurringStart}
                  maxMonth={forecastEnd}
                  label="End Month"
                  onChange={(value) => value && setRecurringEnd(value as MonthKey)}
                />
              )}
              {recurringFrequency === "ANNUAL" && recurringYears > recurringMaxYears && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
                  That's more times than fit the forecast — the most from this month is {recurringMaxYears}.
                </Alert>
              )}
              <Group gap="xs">
                <Button
                  leftSection={editingRecurring ? <IconPencil size={16} /> : <IconPlus size={16} />}
                  color="red"
                  disabled={!recurringValid}
                  onClick={submitRecurring}
                >
                  {editingRecurring ? "Save Changes" : "Add Recurring Expense"}
                </Button>
                {editingRecurring && (
                  <Button variant="default" leftSection={<IconX size={16} />} onClick={resetRecurring}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>

        {/* ── Credit Card ── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Credit Card Bill" type="Credit Card">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={creditCardMonth}
                minMonth={startMonth}
                maxMonth={forecastEnd}
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
              <Group gap="xs">
                <Button
                  leftSection={editingCc ? <IconPencil size={16} /> : <IconPlus size={16} />}
                  disabled={!creditCardLabel.trim() || creditCardAmount <= 0}
                  onClick={submitCc}
                >
                  {editingCc ? "Save Changes" : "Add Bill"}
                </Button>
                {editingCc && (
                  <Button variant="default" leftSection={<IconX size={16} />} onClick={resetCc}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>

        {/* ── Bonus ── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Bonus Income" type="Bonus">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={bonusMonth}
                minMonth={startMonth}
                maxMonth={forecastEnd}
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
              <Group gap="xs">
                <Button
                  leftSection={editingBonus ? <IconPencil size={16} /> : <IconPlus size={16} />}
                  disabled={!bonusDescription.trim() || bonusAmount <= 0}
                  onClick={submitBonus}
                >
                  {editingBonus ? "Save Changes" : "Add Bonus"}
                </Button>
                {editingBonus && (
                  <Button variant="default" leftSection={<IconX size={16} />} onClick={resetBonus}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>

        {/* ── Salary Change ── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard title="Salary Change" type="Salary Change">
            <Stack gap="sm">
              <BuilderMonthSelect
                value={salaryMonth}
                minMonth={startMonth}
                maxMonth={forecastEnd}
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
              <Group gap="xs">
                <Button
                  leftSection={editingSalary ? <IconPencil size={16} /> : <IconPlus size={16} />}
                  disabled={!salaryDescription.trim() || salaryIncome < 0}
                  onClick={submitSalary}
                >
                  {editingSalary ? "Save Changes" : "Add Salary Change"}
                </Button>
                {editingSalary && (
                  <Button variant="default" leftSection={<IconX size={16} />} onClick={resetSalary}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>
      </Grid>

      {/* ── Timeline ── */}
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
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatMonth(event.month)}
                        </Text>
                        {oowIds.has(event.id) && (
                          <Badge color="red" variant="light" size="sm" leftSection={<IconAlertTriangle size={11} />}>
                            Outside
                          </Badge>
                        )}
                      </Group>
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
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconPencil size={14} />}
                          onClick={() => startEdit(event)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => removeHandlers[event.type]?.(event.id)}
                        >
                          Remove
                        </Button>
                      </Group>
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