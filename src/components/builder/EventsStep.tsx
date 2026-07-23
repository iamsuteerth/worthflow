import type { MonthKey } from "@/types/simulation";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBolt,
  IconCash,
  IconCreditCard,
  IconPencil,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import BuilderStepContainer from "@/components/builder/BuilderStepContainer";
import EditItemModal from "@/components/builder/EditItemModal";
import {
  MonthTextAmountFields,
  RecurringFields,
  monthTextAmountValid,
  recurringDraftValid,
  resolveRecurring,
  emptyRecurringDraft,
  annualYearsFromRange,
  type MonthTextAmountDraft,
  type RecurringDraft,
} from "@/components/builder/fields/EventFields";
import { findOutOfWindowItems } from "@/engine/builderWindow";
import { forecastEndMonth } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { useBuilderStore } from "@/store/builderStore";

const TYPE_CONFIG: Record<string, { color: string; accentColor: string; icon: React.ReactNode }> = {
  Expense: { color: "red", accentColor: "var(--mantine-color-red-5)", icon: <IconBolt size={16} /> },
  Recurring: { color: "red", accentColor: "var(--mantine-color-red-4)", icon: <IconRepeat size={16} /> },
  "Credit Card": { color: "orange", accentColor: "var(--mantine-color-orange-5)", icon: <IconCreditCard size={16} /> },
  Bonus: { color: "teal", accentColor: "var(--mantine-color-teal-5)", icon: <IconCash size={16} /> },
  "Salary Change": { color: "brand", accentColor: "var(--mantine-color-brand-5)", icon: <IconTrendingUp size={16} /> },
};

function SectionCard({ title, type, children }: { title: string; type: string; children: React.ReactNode }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG["Expense"];
  return (
    <Card withBorder radius="md" p="lg" style={{ borderLeft: `3px solid ${cfg.accentColor}` }}>
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

// The four "month + text + amount" events share one field-group; only labels differ.
type MtaKind = "oneOff" | "creditCard" | "bonus" | "salary";
interface MtaConfig {
  sectionType: string;
  cardTitle: string;
  editTitle: string;
  monthLabel: string;
  textLabel: string;
  textPlaceholder: string;
  amountLabel: string;
  addLabel: string;
  allowZeroAmount: boolean;
}
const MTA_CONFIG: Record<MtaKind, MtaConfig> = {
  oneOff: {
    sectionType: "Expense", cardTitle: "One-Off Expense", editTitle: "Edit One-Off Expense",
    monthLabel: "Month", textLabel: "Label", textPlaceholder: "e.g. Laptop purchase",
    amountLabel: "Amount", addLabel: "Add Expense", allowZeroAmount: false,
  },
  creditCard: {
    sectionType: "Credit Card", cardTitle: "Credit Card Bill", editTitle: "Edit Credit Card Bill",
    monthLabel: "Month", textLabel: "Label", textPlaceholder: "e.g. December bill",
    amountLabel: "Amount", addLabel: "Add Bill", allowZeroAmount: false,
  },
  bonus: {
    sectionType: "Bonus", cardTitle: "Bonus Income", editTitle: "Edit Bonus",
    monthLabel: "Month", textLabel: "Description", textPlaceholder: "e.g. Annual performance bonus",
    amountLabel: "Amount", addLabel: "Add Bonus", allowZeroAmount: false,
  },
  salary: {
    sectionType: "Salary Change", cardTitle: "Salary Change", editTitle: "Edit Salary Change",
    monthLabel: "Effective Month", textLabel: "Description", textPlaceholder: "e.g. Promotion / role change",
    amountLabel: "New Monthly Income", addLabel: "Add Salary Change", allowZeroAmount: true,
  },
};

function AddMtaCard({
  config, minMonth, maxMonth, initialAmount, onAdd,
}: {
  config: MtaConfig;
  minMonth: MonthKey;
  maxMonth: MonthKey;
  initialAmount: number;
  onAdd: (draft: MonthTextAmountDraft) => void;
}) {
  const fresh = (): MonthTextAmountDraft => ({ month: minMonth, text: "", amount: initialAmount });
  const [draft, setDraft] = useState<MonthTextAmountDraft>(fresh);
  return (
    <SectionCard title={config.cardTitle} type={config.sectionType}>
      <Stack gap="sm">
        <MonthTextAmountFields
          value={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          minMonth={minMonth}
          maxMonth={maxMonth}
          monthLabel={config.monthLabel}
          textLabel={config.textLabel}
          textPlaceholder={config.textPlaceholder}
          amountLabel={config.amountLabel}
          allowZeroAmount={config.allowZeroAmount}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          disabled={!monthTextAmountValid(draft, config.allowZeroAmount)}
          onClick={() => { onAdd(draft); setDraft(fresh()); }}
        >
          {config.addLabel}
        </Button>
      </Stack>
    </SectionCard>
  );
}

function AddRecurringCard({
  forecastStart, forecastEnd, totalMonths, onAdd,
}: {
  forecastStart: MonthKey;
  forecastEnd: MonthKey;
  totalMonths: number;
  onAdd: (draft: RecurringDraft) => void;
}) {
  const [draft, setDraft] = useState<RecurringDraft>(() => emptyRecurringDraft(forecastStart));
  return (
    <SectionCard title="Recurring Expense" type="Recurring">
      <Stack gap="sm">
        <RecurringFields
          value={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          forecastStart={forecastStart}
          forecastEnd={forecastEnd}
          totalMonths={totalMonths}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          color="red"
          disabled={!recurringDraftValid(draft, forecastStart, totalMonths)}
          onClick={() => { onAdd(draft); setDraft(emptyRecurringDraft(forecastStart)); }}
        >
          Add Recurring Expense
        </Button>
      </Stack>
    </SectionCard>
  );
}

type EventEditing =
  | { kind: MtaKind; id: string; draft: MonthTextAmountDraft }
  | { kind: "recurring"; id: string; draft: RecurringDraft }
  | null;

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
  const addRecurringExpense = useBuilderStore((store) => store.addRecurringExpense);
  const removeRecurringExpense = useBuilderStore((store) => store.removeRecurringExpense);
  const updateOneOffExpense = useBuilderStore((store) => store.updateOneOffExpense);
  const updateCreditCardBill = useBuilderStore((store) => store.updateCreditCardBill);
  const updateBonusIncome = useBuilderStore((store) => store.updateBonusIncome);
  const updateSalaryChange = useBuilderStore((store) => store.updateSalaryChange);
  const updateRecurringExpense = useBuilderStore((store) => store.updateRecurringExpense);

  const startMonth = state.startMonth;
  const forecastEnd = forecastEndMonth(state.startMonth, state.totalMonths);

  const [editing, setEditing] = useState<EventEditing>(null);

  const oowIds = useMemo(() => new Set(findOutOfWindowItems(state).map((i) => i.id)), [state]);

  const timeline = useMemo(() => {
    const events = [
      ...state.oneOffExpenses.map((e) => ({ id: e.id, month: e.month, type: "Expense", description: e.label, value: money(e.amount) })),
      ...state.creditCardBills.map((e) => ({ id: e.id, month: e.month, type: "Credit Card", description: e.label, value: money(e.amount) })),
      ...(state.recurringExpenses ?? []).map((e) => ({
        id: e.id, month: e.startMonth, type: "Recurring",
        description: `${e.name} (→ ${formatMonth(e.endMonth)})${e.frequency === "ANNUAL" ? " · Annual" : ""}`,
        value: e.frequency === "ANNUAL" ? `${money(e.amount)}/yr` : `${money(e.amount)}/mo`,
      })),
      ...state.bonusIncome.map((e) => ({ id: e.id, month: e.month, type: "Bonus", description: e.description, value: money(e.amount) })),
      ...state.salaryChanges.map((e) => ({ id: e.id, month: e.effectiveMonth, type: "Salary Change", description: e.description, value: `${money(e.newMonthlyIncome)}/month` })),
    ];
    return events.sort((a, b) => a.month.localeCompare(b.month));
  }, [state.oneOffExpenses, state.bonusIncome, state.salaryChanges, state.creditCardBills, state.recurringExpenses]);

  const removeHandlers: Record<string, (id: string) => void> = {
    Expense: removeOneOffExpense,
    "Credit Card": removeCreditCardBill,
    Bonus: removeBonusIncome,
    "Salary Change": removeSalaryChange,
    Recurring: removeRecurringExpense,
  };

  function startEdit(event: { id: string; type: string }) {
    if (event.type === "Expense") {
      const e = state.oneOffExpenses.find((x) => x.id === event.id);
      if (e) setEditing({ kind: "oneOff", id: e.id, draft: { month: e.month, text: e.label, amount: e.amount } });
    } else if (event.type === "Credit Card") {
      const b = state.creditCardBills.find((x) => x.id === event.id);
      if (b) setEditing({ kind: "creditCard", id: b.id, draft: { month: b.month, text: b.label, amount: b.amount } });
    } else if (event.type === "Bonus") {
      const b = state.bonusIncome.find((x) => x.id === event.id);
      if (b) setEditing({ kind: "bonus", id: b.id, draft: { month: b.month, text: b.description, amount: b.amount } });
    } else if (event.type === "Salary Change") {
      const s = state.salaryChanges.find((x) => x.id === event.id);
      if (s) setEditing({ kind: "salary", id: s.id, draft: { month: s.effectiveMonth, text: s.description, amount: s.newMonthlyIncome } });
    } else if (event.type === "Recurring") {
      const r = state.recurringExpenses.find((x) => x.id === event.id);
      if (r) {
        const freq = r.frequency ?? "MONTHLY";
        setEditing({
          kind: "recurring", id: r.id,
          draft: {
            name: r.name, amount: r.amount, startMonth: r.startMonth, endMonth: r.endMonth,
            years: freq === "ANNUAL" ? annualYearsFromRange(r.startMonth, r.endMonth) : 1, frequency: freq,
          },
        });
      }
    }
  }

  function saveEdit() {
    if (!editing) return;
    const { id } = editing;
    if (editing.kind === "recurring") {
      updateRecurringExpense({ id, ...resolveRecurring(editing.draft) });
    } else {
      const { month, text, amount } = editing.draft;
      if (editing.kind === "oneOff") updateOneOffExpense({ id, month, label: text, amount });
      else if (editing.kind === "creditCard") updateCreditCardBill({ id, month, amount, label: text });
      else if (editing.kind === "bonus") updateBonusIncome({ id, month, amount, description: text });
      else updateSalaryChange({ id, effectiveMonth: month, newMonthlyIncome: amount, description: text });
    }
    setEditing(null);
  }

  const editValid =
    editing === null
      ? false
      : editing.kind === "recurring"
        ? recurringDraftValid(editing.draft, startMonth, state.totalMonths)
        : monthTextAmountValid(editing.draft, MTA_CONFIG[editing.kind].allowZeroAmount);

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
        <Grid.Col span={{ base: 12, md: 6 }}>
          <AddMtaCard
            config={MTA_CONFIG.oneOff} minMonth={startMonth} maxMonth={forecastEnd} initialAmount={0}
            onAdd={(d) => addOneOffExpense({ id: crypto.randomUUID(), month: d.month, label: d.text, amount: d.amount })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <AddRecurringCard
            forecastStart={startMonth} forecastEnd={forecastEnd} totalMonths={state.totalMonths}
            onAdd={(d) => addRecurringExpense({ id: crypto.randomUUID(), ...resolveRecurring(d) })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <AddMtaCard
            config={MTA_CONFIG.creditCard} minMonth={startMonth} maxMonth={forecastEnd} initialAmount={0}
            onAdd={(d) => addCreditCardBill({ id: crypto.randomUUID(), month: d.month, amount: d.amount, label: d.text })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <AddMtaCard
            config={MTA_CONFIG.bonus} minMonth={startMonth} maxMonth={forecastEnd} initialAmount={0}
            onAdd={(d) => addBonusIncome({ id: crypto.randomUUID(), month: d.month, amount: d.amount, description: d.text })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <AddMtaCard
            config={MTA_CONFIG.salary} minMonth={startMonth} maxMonth={forecastEnd} initialAmount={state.monthlyIncome}
            onAdd={(d) => addSalaryChange({ id: crypto.randomUUID(), effectiveMonth: d.month, newMonthlyIncome: d.amount, description: d.text })}
          />
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
          <Table.ScrollContainer minWidth={600}>
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
                          <Tooltip label="Edit">
                            <ActionIcon variant="subtle" aria-label="Edit" onClick={() => startEdit(event)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove">
                            <ActionIcon variant="subtle" color="red" aria-label="Remove" onClick={() => removeHandlers[event.type]?.(event.id)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <EditItemModal
        opened={editing !== null}
        title={editing && editing.kind !== "recurring" ? MTA_CONFIG[editing.kind].editTitle : "Edit Recurring Expense"}
        canSave={editValid}
        onSave={saveEdit}
        onClose={() => setEditing(null)}
      >
        {editing && editing.kind !== "recurring" && (
          <MonthTextAmountFields
            value={editing.draft}
            onChange={(patch) => setEditing((e) => (e && e.kind !== "recurring" ? { ...e, draft: { ...e.draft, ...patch } } : e))}
            minMonth={startMonth}
            maxMonth={forecastEnd}
            monthLabel={MTA_CONFIG[editing.kind].monthLabel}
            textLabel={MTA_CONFIG[editing.kind].textLabel}
            textPlaceholder={MTA_CONFIG[editing.kind].textPlaceholder}
            amountLabel={MTA_CONFIG[editing.kind].amountLabel}
            allowZeroAmount={MTA_CONFIG[editing.kind].allowZeroAmount}
          />
        )}
        {editing && editing.kind === "recurring" && (
          <RecurringFields
            value={editing.draft}
            onChange={(patch) => setEditing((e) => (e && e.kind === "recurring" ? { ...e, draft: { ...e.draft, ...patch } } : e))}
            forecastStart={startMonth}
            forecastEnd={forecastEnd}
            totalMonths={state.totalMonths}
          />
        )}
      </EditItemModal>
    </BuilderStepContainer>
  );
}
