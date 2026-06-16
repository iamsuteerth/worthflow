// src/components/scenario/RuntimeEventList.tsx
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import type { RuntimeEvent } from "@/types/runtimeEvent";
import type { MonthKey } from "@/types/simulation";
import type { InvestmentAccount } from "@/types/investmentAccount";
import { formatMonth } from "@/engine/monthFormatting";
import MonthSelect from "@/components/common/MonthSelect";

// ── Badge display config ─────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string }> = {
  ONE_OFF_EXPENSE:            { label: "Expense",          color: "red"    },
  CREDIT_CARD_EXPENSE:        { label: "Credit Card",      color: "orange" },
  RECURRING_EXPENSE:          { label: "Recurring",        color: "red"    },
  SPENDING_OVERRIDE:          { label: "Spending Override", color: "pink"  },
  BONUS_INCOME:               { label: "Bonus",            color: "green"  },
  SALARY_CHANGE:              { label: "Salary",           color: "blue"   },
  OPENING_CASH_OVERRIDE:      { label: "Opening Cash",     color: "yellow" },
  FD:                         { label: "FD",               color: "teal"   },
  RD:                         { label: "RD",               color: "violet" },
  ACCOUNT_AMOUNT_OVERRIDE:    { label: "Amount Override",  color: "indigo" },
  ACCOUNT_RETURN_OVERRIDE:    { label: "Return Override",  color: "grape"  },
  INVESTMENT_DEPOSIT:         { label: "Deposit",          color: "cyan"   },
  INVESTMENT_WITHDRAWAL:      { label: "Withdrawal",       color: "orange" },
};

// ── Human-readable summary per event type ────────────────────────────────────

function eventSummary(event: RuntimeEvent, accounts: InvestmentAccount[]): string {
  switch (event.type) {
    case "ONE_OFF_EXPENSE":
      return `${event.label} • ₹${event.amount.toLocaleString("en-IN")} in ${formatMonth(event.month)}`;
    case "CREDIT_CARD_EXPENSE":
      return `${event.label} • ₹${event.amount.toLocaleString("en-IN")} in ${formatMonth(event.month)}`;
    case "RECURRING_EXPENSE":
      return `${event.name} • ₹${event.amount.toLocaleString("en-IN")}${event.frequency === "ANNUAL" ? "/yr" : "/mo"} · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}${event.frequency === "ANNUAL" ? " (Annual)" : ""}`;
    case "BONUS_INCOME":
      return `${event.description} • ₹${event.amount.toLocaleString("en-IN")} in ${formatMonth(event.month)}`;
    case "SALARY_CHANGE":
      return `${event.description} • ₹${event.newMonthlyIncome.toLocaleString("en-IN")}/mo from ${formatMonth(event.effectiveMonth)}`;
    case "FD":
      return `${event.name} • ₹${event.principal.toLocaleString("en-IN")} @ ${event.rate}% from ${formatMonth(event.startMonth)}`;
    case "RD":
      return `${event.name} • ₹${event.monthlyContribution.toLocaleString("en-IN")}/mo @ ${event.rate}% from ${formatMonth(event.startMonth)}`;
    case "ACCOUNT_AMOUNT_OVERRIDE": {
      const account = accounts.find((a) => a.id === event.accountId);
      return `${account?.name ?? "Account"} • ₹${event.amount.toLocaleString("en-IN")}/mo · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}`;
    }
    case "ACCOUNT_RETURN_OVERRIDE": {
      const account = accounts.find((a) => a.id === event.accountId);
      return `${account?.name ?? "Account"} • ${event.annualReturn}% · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}`;
    }
    case "INVESTMENT_DEPOSIT": {
      const account = accounts.find((a) => a.id === event.accountId);
      return `${account?.name ?? "Account"} • ₹${event.amount.toLocaleString("en-IN")} in ${formatMonth(event.month)}`;
    }
    case "INVESTMENT_WITHDRAWAL": {
      const account = accounts.find((a) => a.id === event.accountId);
      return `${account?.name ?? "Account"} • ₹${event.amount.toLocaleString("en-IN")} in ${formatMonth(event.month)}`;
    }
    case "SPENDING_OVERRIDE":
      return `₹${event.amount.toLocaleString("en-IN")}/mo · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)} (replaces baseline)`;
    case "OPENING_CASH_OVERRIDE":
      return `Opening cash → ₹${event.amount.toLocaleString("en-IN")}`;
    default:
      return "";
  }
}

// ── Edit modal ───────────────────────────────────────────────────────────────

export function EditEventModal({
  event,
  opened,
  onClose,
}: {
  event: RuntimeEvent;
  opened: boolean;
  onClose: () => void;
}) {
  const updateEvent = usePlannerStore((s) => s.updateRuntimeEvent);

  // Extract initial values by switching on the discriminant — avoids accessing
  // keys that don't exist on all union members (TypeScript strict mode).
  function getInitialAmount(): number {
    switch (event.type) {
      case "ONE_OFF_EXPENSE":
      case "CREDIT_CARD_EXPENSE":
      case "RECURRING_EXPENSE":
      case "BONUS_INCOME":
      case "INVESTMENT_DEPOSIT":
      case "INVESTMENT_WITHDRAWAL":
      case "ACCOUNT_AMOUNT_OVERRIDE":
      case "SPENDING_OVERRIDE":
      case "OPENING_CASH_OVERRIDE":
        return event.amount;
      case "SALARY_CHANGE":
        return event.newMonthlyIncome;
      default:
        return 0;
    }
  }

  function getInitialLabel(): string {
    switch (event.type) {
      case "ONE_OFF_EXPENSE":
      case "CREDIT_CARD_EXPENSE":
        return event.label;
      case "BONUS_INCOME":
      case "SALARY_CHANGE":
        return event.description;
      case "RECURRING_EXPENSE":
        return event.name;
      default:
        return "";
    }
  }

  function getInitialMonth(): MonthKey | null {
    switch (event.type) {
      case "ONE_OFF_EXPENSE":
      case "CREDIT_CARD_EXPENSE":
      case "BONUS_INCOME":
      case "INVESTMENT_DEPOSIT":
      case "INVESTMENT_WITHDRAWAL":
        return event.month;
      case "SALARY_CHANGE":
        return event.effectiveMonth;
      case "RECURRING_EXPENSE":
        return event.startMonth;
      default:
        return null;
    }
  }

  function getInitialReturn(): number {
    return event.type === "ACCOUNT_RETURN_OVERRIDE" ? event.annualReturn : 0;
  }

  const [localAmount, setLocalAmount] = useState(getInitialAmount);
  const [localLabel, setLocalLabel] = useState(getInitialLabel);
  const [localMonth, setLocalMonth] = useState<MonthKey | null>(getInitialMonth);
  const [localReturn, setLocalReturn] = useState(getInitialReturn);

  function handleSave() {
    const changes: Partial<RuntimeEvent> = {};
    switch (event.type) {
      case "ONE_OFF_EXPENSE":
      case "CREDIT_CARD_EXPENSE":
        Object.assign(changes, { amount: localAmount, label: localLabel, month: localMonth });
        break;
      case "RECURRING_EXPENSE":
        Object.assign(changes, { amount: localAmount, name: localLabel });
        break;
      case "BONUS_INCOME":
        Object.assign(changes, { amount: localAmount, description: localLabel, month: localMonth });
        break;
      case "SALARY_CHANGE":
        Object.assign(changes, { newMonthlyIncome: localAmount, description: localLabel, effectiveMonth: localMonth });
        break;
      case "INVESTMENT_DEPOSIT":
      case "INVESTMENT_WITHDRAWAL":
        Object.assign(changes, { amount: localAmount, month: localMonth });
        break;
      case "ACCOUNT_AMOUNT_OVERRIDE":
      case "SPENDING_OVERRIDE":
        Object.assign(changes, { amount: localAmount });
        break;
      case "OPENING_CASH_OVERRIDE":
        Object.assign(changes, { amount: localAmount });
        break;
      case "ACCOUNT_RETURN_OVERRIDE":
        Object.assign(changes, { annualReturn: localReturn });
        break;
      default:
        break;
    }
    updateEvent(event.id, changes);
    onClose();
  }

  const showAmount = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","RECURRING_EXPENSE",
    "BONUS_INCOME","INVESTMENT_DEPOSIT","INVESTMENT_WITHDRAWAL","ACCOUNT_AMOUNT_OVERRIDE",
    "SPENDING_OVERRIDE","OPENING_CASH_OVERRIDE"].includes(event.type);
  const showReturn = event.type === "ACCOUNT_RETURN_OVERRIDE";
  const showLabel = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","RECURRING_EXPENSE","BONUS_INCOME","SALARY_CHANGE"].includes(event.type);
  const showMonth = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","BONUS_INCOME","SALARY_CHANGE","INVESTMENT_DEPOSIT","INVESTMENT_WITHDRAWAL"].includes(event.type);
  const allowNegativeAmount = event.type === "OPENING_CASH_OVERRIDE";

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Event" centered size="sm">
      <Stack gap="sm">
        {showLabel && (
          <TextInput
            maxLength={50}
            label={event.type === "SALARY_CHANGE" ? "Description" : "Label/Name"}
            value={localLabel}
            onChange={(e) => setLocalLabel(e.currentTarget.value)}
          />
        )}
        {showMonth && (
          <MonthSelect
            label={event.type === "SALARY_CHANGE" ? "Effective Month" : "Month"}
            value={localMonth}
            onChange={(v) => setLocalMonth(v as MonthKey | null)}
          />
        )}
        {showAmount && (
          <NumberInput
            label={event.type === "SALARY_CHANGE" ? "New Monthly Salary" : "Amount"}
            value={localAmount}
            min={allowNegativeAmount ? undefined : 0}
            allowNegative={allowNegativeAmount}
            thousandSeparator=","
            prefix="₹"
            onChange={(v) => setLocalAmount(Number(v))}
          />
        )}
        {showReturn && (
          <NumberInput
            label="Annual Return (%)"
            value={localReturn}
            min={-99.99}
            max={1000}
            decimalScale={2}
            suffix="%"
            onChange={(v) => setLocalReturn(Number(v))}
          />
        )}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" size="xs" onClick={onClose}>Cancel</Button>
          <Button size="xs" onClick={handleSave}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  filterTypes?: RuntimeEvent["type"][];
  filterAccountId?: string;
  filterIds?: string[];
}

export default function RuntimeEventList({ filterTypes, filterAccountId, filterIds }: Props) {
  const events     = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const accounts   = usePlannerStore((s) => s.config.investments.accounts);
  const deleteEvent = usePlannerStore((s) => s.deleteRuntimeEvent);

  const [editingEvent, setEditingEvent] = useState<RuntimeEvent | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  const displayed = events
    .filter((e) => !filterTypes || filterTypes.includes(e.type))
    .filter((e) => !filterAccountId || ("accountId" in e && e.accountId === filterAccountId))
    .filter((e) => !filterIds || filterIds.includes(e.id));

  if (displayed.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No events.
      </Text>
    );
  }

  // These event types have complex nested structure — offer delete only
  const deleteOnlyTypes = new Set(["FD", "RD"]);

  return (
    <>
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          opened={modalOpened}
          onClose={() => { closeModal(); setEditingEvent(null); }}
        />
      )}

      <Stack gap="xs">
        {displayed.map((event) => {
          const meta = TYPE_META[event.type] ?? { label: event.type, color: "gray" };
          const canEdit = !deleteOnlyTypes.has(event.type);

          return (
            <Card key={event.id} withBorder radius="sm" p="sm">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Badge color={meta.color} variant="light" size="xs">
                    {meta.label}
                  </Badge>
                  <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
                    {eventSummary(event, accounts)}
                  </Text>
                </Stack>

                <Group gap={4} style={{ flexShrink: 0 }}>
                  {canEdit && (
                    <Tooltip label="Edit">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => { setEditingEvent(event); openModal(); }}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Delete">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="red"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          );
        })}
      </Stack>
    </>
  );
}