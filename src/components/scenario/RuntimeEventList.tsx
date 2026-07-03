import type { RuntimeEvent } from "@/types/runtimeEvent";
import type { MonthKey } from "@/types/simulation";
import type { InvestmentAccount } from "@/types/investmentAccount";

import {
  ActionIcon,
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
import { useMemo, useState } from "react";
import { getAvailableCash, usePlannerStore } from "@/store/plannerStore";
import { simulate } from "@/engine/simulate";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import { forecastEndMonth } from "@/engine/dateUtils";
import { getEventVisual } from "@/theme/eventVisuals";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import MonthSelect from "@/components/common/MonthSelect";

// The event's own identity (user label / name / account), shown as the card title.
function eventName(event: RuntimeEvent, accounts: InvestmentAccount[]): string {
  switch (event.type) {
    case "ONE_OFF_EXPENSE":
    case "CREDIT_CARD_EXPENSE":
      return event.label;
    case "RECURRING_EXPENSE":
    case "FD":
    case "RD":
      return event.name;
    case "BONUS_INCOME":
    case "SALARY_CHANGE":
      return event.description;
    case "ACCOUNT_AMOUNT_OVERRIDE":
    case "ACCOUNT_RETURN_OVERRIDE":
    case "INVESTMENT_DEPOSIT":
    case "INVESTMENT_WITHDRAWAL":
      return accounts.find((a) => a.id === event.accountId)?.name ?? "Account";
    case "SPENDING_OVERRIDE":
      return "Monthly spend";
    case "OPENING_CASH_OVERRIDE":
      return "Opening cash";
    default:
      return "";
  }
}

// The amount/timing detail, sans the name (which is the title) and the type
// (which moves into the subtext alongside this).
function eventDetails(event: RuntimeEvent): string {
  switch (event.type) {
    case "ONE_OFF_EXPENSE":
    case "CREDIT_CARD_EXPENSE":
      return `${money(event.amount)} in ${formatMonth(event.month)}`;
    case "RECURRING_EXPENSE":
      return `${money(event.amount)}${event.frequency === "ANNUAL" ? "/yr" : "/mo"} · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}${event.frequency === "ANNUAL" ? " (Annual)" : ""}`;
    case "BONUS_INCOME":
      return `${money(event.amount)} in ${formatMonth(event.month)}`;
    case "SALARY_CHANGE":
      return `${money(event.newMonthlyIncome)}/mo from ${formatMonth(event.effectiveMonth)}`;
    case "FD":
      return `${money(event.principal)} @ ${event.rate}% from ${formatMonth(event.startMonth)}`;
    case "RD":
      return `${money(event.monthlyContribution)}/mo @ ${event.rate}% from ${formatMonth(event.startMonth)}`;
    case "ACCOUNT_AMOUNT_OVERRIDE":
      return `${money(event.amount)}/mo · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}`;
    case "ACCOUNT_RETURN_OVERRIDE":
      return `${event.annualReturn}% · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)}`;
    case "INVESTMENT_DEPOSIT":
    case "INVESTMENT_WITHDRAWAL":
      return `${money(event.amount)} in ${formatMonth(event.month)}`;
    case "SPENDING_OVERRIDE":
      return `${money(event.amount)}/mo · ${formatMonth(event.startMonth)} → ${formatMonth(event.endMonth)} (replaces baseline)`;
    case "OPENING_CASH_OVERRIDE":
      return `→ ${money(event.amount)}`;
    default:
      return "";
  }
}

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
      case "FD":
        return event.principal;
      case "RD":
        return event.monthlyContribution;
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
      case "FD":
      case "RD":
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
      case "FD":
      case "RD":
        return event.startMonth;
      default:
        return null;
    }
  }

  function getInitialReturn(): number {
    switch (event.type) {
      case "ACCOUNT_RETURN_OVERRIDE": return event.annualReturn;
      case "FD":
      case "RD":
        return event.rate;
      default:
        return 0;
    }
  }

  function getInitialDuration(): number {
    if (event.type === "FD" || event.type === "RD") return event.durationMonths;
    return 12;
  }

  const [localAmount, setLocalAmount] = useState(getInitialAmount);
  const [localLabel, setLocalLabel] = useState(getInitialLabel);
  const [localMonth, setLocalMonth] = useState<MonthKey | null>(getInitialMonth);
  const [localReturn, setLocalReturn] = useState(getInitialReturn);
  const [localDuration, setLocalDuration] = useState(getInitialDuration);

  const baseConfig = usePlannerStore((s) => s.baseConfig);
  const overrides = usePlannerStore((s) => s.overrides);
  const config = usePlannerStore((s) => s.config);

  const eventAccount =
    "accountId" in event
      ? config.investments.accounts.find((a) => a.id === event.accountId)
      : undefined;

  const cap = useMemo(() => {
    if (!localMonth) return null;
    const others = (overrides.runtimeEvents ?? []).filter((e) => e.id !== event.id);
    const without = { ...overrides, runtimeEvents: others };
    const cfg = buildEffectiveConfig(baseConfig, without);
    if (event.type === "FD" || event.type === "RD" || event.type === "INVESTMENT_DEPOSIT") {
      return getAvailableCash(cfg, without, localMonth);
    }
    if (event.type === "INVESTMENT_WITHDRAWAL") {
      const row = simulate(cfg, without).rows.find((r) => r.month === localMonth);
      const snap = row?.assets.accountSnapshots.find((s) => s.accountId === event.accountId);
      return Math.max(0, snap?.value ?? 0);
    }
    return null;
  }, [baseConfig, overrides, event, localMonth]);

  const exceedsCap = cap !== null && localAmount > cap;
  const capLabel = event.type === "INVESTMENT_WITHDRAWAL" ? "Account balance" : "Available cash";

  const forecastStart = baseConfig.forecast.startMonth;
  const forecastEnd = forecastEndMonth(baseConfig.forecast.startMonth, baseConfig.forecast.totalMonths);
  const monthMin =
    (event.type === "INVESTMENT_DEPOSIT" || event.type === "INVESTMENT_WITHDRAWAL") && eventAccount
      ? eventAccount.startMonth
      : forecastStart;

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
      case "FD":
        Object.assign(changes, { name: localLabel, principal: localAmount, rate: localReturn, durationMonths: localDuration, startMonth: localMonth });
        break;
      case "RD":
        Object.assign(changes, { name: localLabel, monthlyContribution: localAmount, rate: localReturn, durationMonths: localDuration, startMonth: localMonth });
        break;
      default:
        break;
    }
    updateEvent(event.id, changes);
    onClose();
  }

  const showAmount = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","RECURRING_EXPENSE",
    "BONUS_INCOME","INVESTMENT_DEPOSIT","INVESTMENT_WITHDRAWAL","ACCOUNT_AMOUNT_OVERRIDE",
    "SPENDING_OVERRIDE","OPENING_CASH_OVERRIDE","FD","RD"].includes(event.type);
  const showReturn = event.type === "ACCOUNT_RETURN_OVERRIDE";
  const showRate   = event.type === "FD" || event.type === "RD";
  const showLabel = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","RECURRING_EXPENSE","BONUS_INCOME","SALARY_CHANGE","FD","RD"].includes(event.type);
  const showMonth = ["ONE_OFF_EXPENSE","CREDIT_CARD_EXPENSE","BONUS_INCOME","SALARY_CHANGE","INVESTMENT_DEPOSIT","INVESTMENT_WITHDRAWAL","FD","RD"].includes(event.type);
  const showDuration = event.type === "FD" || event.type === "RD";
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
            minMonth={monthMin}
            maxMonth={forecastEnd}
            onChange={(v) => setLocalMonth(v as MonthKey | null)}
          />
        )}
        {showAmount && (
          <NumberInput
            label={
              event.type === "SALARY_CHANGE" ? "New Monthly Salary" :
              event.type === "FD" ? "Principal" :
              event.type === "RD" ? "Monthly Contribution" :
              "Amount"
            }
            value={localAmount}
            min={allowNegativeAmount ? undefined : 0}
            max={cap ?? undefined}
            allowNegative={allowNegativeAmount}
            thousandSeparator=","
            prefix="₹"
            onChange={(v) => setLocalAmount(Number(v))}
          />
        )}
        {cap !== null && (
          <Text size="xs" c="dimmed">
            {capLabel}
            {localMonth ? ` at ${formatMonth(localMonth)}` : ""}:{" "}
            <Text span fw={600} c={exceedsCap ? "red" : "teal"} style={{ fontVariantNumeric: "tabular-nums" }}>
              {money(cap)}
            </Text>
          </Text>
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
        {showRate && (
          <NumberInput
            label="Interest Rate (% p.a.)"
            value={localReturn}
            min={0}
            max={15}
            clampBehavior="strict"
            decimalScale={2}
            suffix="%"
            onChange={(v) => setLocalReturn(Number(v))}
          />
        )}
        {showDuration && (
          <NumberInput
            label="Duration (months)"
            value={localDuration}
            min={1}
            max={120}
            clampBehavior="strict"
            onChange={(v) => setLocalDuration(Number(v))}
          />
        )}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" size="xs" onClick={onClose}>Cancel</Button>
          <Button size="xs" onClick={handleSave} disabled={exceedsCap}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface Props {
  filterTypes?: RuntimeEvent["type"][];
  filterAccountId?: string;
  filterIds?: string[];
}

export default function RuntimeEventList({ filterTypes, filterAccountId, filterIds }: Props) {
  const events      = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const accounts    = usePlannerStore((s) => s.config.investments.accounts);
  const deleteEvent = usePlannerStore((s) => s.deleteRuntimeEvent);

  const [editingEvent, setEditingEvent] = useState<RuntimeEvent | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  const displayed = events
    .filter((e) => !filterTypes || filterTypes.includes(e.type))
    .filter((e) => !filterAccountId || ("accountId" in e && e.accountId === filterAccountId))
    .filter((e) => !filterIds || filterIds.includes(e.id));

  if (displayed.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">No events.</Text>
    );
  }

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
          const { label, color } = getEventVisual(event.type);

          return (
            <Card
              key={event.id}
              withBorder
              radius="md"
              p="sm"
              style={{ borderLeft: `3px solid var(--mantine-color-${color}-5)` }}
            >
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={500} style={{ wordBreak: "break-word" }}>
                    {eventName(event, accounts)}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
                    {label} • {eventDetails(event)}
                  </Text>
                </Stack>

                <Group gap={4} style={{ flexShrink: 0 }}>
                  <Tooltip label="Edit">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="brand"
                      onClick={() => { setEditingEvent(event); openModal(); }}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>
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
