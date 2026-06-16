import { Fragment, useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight, IconEdit, IconTrash } from "@tabler/icons-react";
import { useSimulation } from "@/hooks/useSimulation";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { formatMonth } from "@/engine/monthFormatting";
import { generateMonths, getMonthIndex } from "@/engine/dateUtils";
import { buildAccountSchedule, type ScheduleRange } from "@/engine/accountSchedule";
import type { MonthKey } from "@/types/simulation";
import { money } from "@/components/tables/tableUtils";
import { Emptystate } from "@/components/tables/Emptystate";
import { EditEventModal } from "@/components/scenario/RuntimeEventList";

function rangeLabel(range: ScheduleRange, kind: "contribution" | "return"): string {
  if (range.source === "DEFAULT") {
    return kind === "contribution" ? "Default Contribution" : "Default Return";
  }
  return kind === "contribution" ? "Amount Override" : "Return Override";
}

function rangeColor(range: ScheduleRange, kind: "contribution" | "return"): string {
  if (range.source === "DEFAULT") return "gray";
  return kind === "contribution" ? "indigo" : "grape";
}

function rangeSpan(range: ScheduleRange, months: MonthKey[]): number {
  const start = getMonthIndex(range.startMonth, months);
  const end = getMonthIndex(range.endMonth, months);
  return Math.max(1, end - start + 1);
}

function OverrideActions({ overrideId }: { overrideId: string }) {
  const events = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const deleteEvent = usePlannerStore((s) => s.deleteRuntimeEvent);
  const [modalOpened, { open, close }] = useDisclosure(false);

  const event = events.find((e) => e.id === overrideId);
  if (!event) return null;

  return (
    <>
      <EditEventModal event={event} opened={modalOpened} onClose={close} />
      <Group gap={4} wrap="nowrap">
        <ActionIcon size="sm" variant="light" color="blue" onClick={open} aria-label="Edit override">
          <IconEdit size={14} />
        </ActionIcon>
        <ActionIcon size="sm" variant="light" color="red" onClick={() => deleteEvent(event.id)} aria-label="Delete override">
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </>
  );
}

function ScheduleBar({ ranges, months, kind }: { ranges: ScheduleRange[]; months: MonthKey[]; kind: "contribution" | "return" }) {
  return (
    <div style={{ display: "flex", width: "100%", height: 8, borderRadius: 4, overflow: "hidden" }}>
      {ranges.map((range, i) => (
        <div
          key={i}
          style={{
            flexGrow: rangeSpan(range, months),
            flexBasis: 0,
            backgroundColor: `var(--mantine-color-${rangeColor(range, kind)}-${range.source === "OVERRIDE" ? 5 : 3})`,
          }}
        />
      ))}
    </div>
  );
}

function ScheduleRangeRow({ range, kind }: { range: ScheduleRange; kind: "contribution" | "return" }) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        <Badge size="xs" variant="light" color={rangeColor(range, kind)}>
          {rangeLabel(range, kind)}
        </Badge>
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {range.startMonth === range.endMonth
            ? formatMonth(range.startMonth)
            : `${formatMonth(range.startMonth)} – ${formatMonth(range.endMonth)}`}
        </Text>
      </Group>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {kind === "contribution" ? `${money(range.value)}/mo` : `${range.value}%`}
        </Text>
        {range.source === "OVERRIDE" && range.overrideId && (
          <OverrideActions overrideId={range.overrideId} />
        )}
      </Group>
    </Group>
  );
}

function ScheduleTimeline({
  title,
  ranges,
  kind,
  months,
}: {
  title: string;
  ranges: ScheduleRange[];
  kind: "contribution" | "return";
  months: MonthKey[];
}) {
  if (ranges.length === 0) return null;

  return (
    <Stack gap={6} style={{ flex: 1, minWidth: 260 }}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        {title}
      </Text>
      <ScheduleBar ranges={ranges} months={months} kind={kind} />
      <Stack gap={4}>
        {ranges.map((range, i) => (
          <ScheduleRangeRow key={i} range={range} kind={kind} />
        ))}
      </Stack>
    </Stack>
  );
}

// Account deletion (with confirmation) cascades to its overrides, deposits,
// and withdrawals via plannerStore.deleteInvestmentAccount. No new event type
// or audit trail; baselineAccountIds is intentionally left unchanged.
function DeleteAccountAction({ accountId, accountName }: { accountId: string; accountName: string }) {
  const deleteAccount = usePlannerStore((s) => s.deleteInvestmentAccount);
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Delete Account" centered size="sm">
        <Stack gap="sm">
          <Text size="sm">
            Delete <Text span fw={700}>{accountName}</Text>? This removes all of its amount
            overrides, return overrides, deposits, and withdrawals. This cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" onClick={close}>Cancel</Button>
            <Button color="red" size="xs" onClick={() => { deleteAccount(accountId); close(); }}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
      <ActionIcon size="sm" variant="light" color="red" onClick={open} aria-label="Delete account">
        <IconTrash size={14} />
      </ActionIcon>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</Text>
    </Stack>
  );
}

export default function InvestmentAccountsTable() {
  const config = usePlannerStore((s) => s.config);
  const baselineAccountIds = usePlannerStore((s) => s.baselineAccountIds);
  const result = useSimulation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const highlightAccountId = useUiStore((s) => s.highlightAccountId);
  const setHighlightAccountId = useUiStore((s) => s.setHighlightAccountId);

  useEffect(() => {
    if (!highlightAccountId) return;
    const timer = setTimeout(() => setHighlightAccountId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightAccountId, setHighlightAccountId]);

  const accounts = config.investments.accounts;

  if (accounts.length === 0) {
    return (
      <Emptystate
        title="No Investment Accounts"
        description="Add an account from the Scenario Lab → Investments → New Account."
      />
    );
  }

  const forecastMonths = generateMonths(config.forecast.startMonth, config.forecast.totalMonths);

  // Get final row for closing values
  const finalRow = result.rows[result.rows.length - 1];

  function toggleExpanded(accountId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  return (
    <Stack gap="md">
      <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
        <Table miw={520} striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              <Table.Th>Account</Table.Th>
              <Table.Th>Start Month</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Current Value</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {accounts.map((account) => {
              const finalSnapshot = finalRow?.assets.accountSnapshots.find(
                (snap) => snap.accountId === account.id
              );
              const currentValue = finalSnapshot?.value ?? account.openingBalance;

              const totalContributions = result.summary.accountContributions[account.id] ?? 0;
              const xirr = result.summary.accountXirr[account.id] ?? null;

              const isExpanded = expanded.has(account.id);
              const schedule = buildAccountSchedule(config, account.id);
              const isNew = !baselineAccountIds.includes(account.id);
              const isHighlighted = highlightAccountId === account.id;

              return (
                <Fragment key={account.id}>
                  <Table.Tr
                    style={isHighlighted ? { backgroundColor: "var(--mantine-color-green-light)" } : undefined}
                  >
                    <Table.Td>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={() => toggleExpanded(account.id)}
                        aria-label="Toggle schedule"
                      >
                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </ActionIcon>
                    </Table.Td>

                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={600} size="sm">
                          {account.name}
                        </Text>
                        {isNew && (
                          <Badge size="xs" variant="light" color="green">
                            Added
                          </Badge>
                        )}
                      </Group>
                      {account.openingBalance > 0 && (
                        <Text size="xs" c="dimmed">
                          Opening: {money(account.openingBalance)}
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">{formatMonth(account.startMonth)}</Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "right" }}>
                      <Text fw={700} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {money(currentValue)}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <DeleteAccountAction accountId={account.id} accountName={account.name} />
                    </Table.Td>
                  </Table.Tr>

                  {isExpanded && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Stack gap="md" py="xs">
                          {schedule.beyondForecast ? (
                            <Text size="xs" c="dimmed">
                              Starts {formatMonth(account.startMonth)} (beyond forecast).
                            </Text>
                          ) : (
                            <>
                              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
                                <Stat label="Monthly Contribution" value={`${money(account.defaultMonthlyContribution)}/mo`} />
                                <Stat label="Return %" value={`${account.defaultAnnualReturn}%`} />
                                <Stat label="Total Contributions" value={money(totalContributions)} />
                                <Stat label="XIRR" value={xirr === null ? "-" : `${xirr.toFixed(2)}%`} />
                              </SimpleGrid>

                              <Group align="flex-start" gap="xl" wrap="wrap">
                                <ScheduleTimeline
                                  title="Contribution Timeline"
                                  ranges={schedule.contributionRanges}
                                  kind="contribution"
                                  months={forecastMonths}
                                />
                                <ScheduleTimeline
                                  title="Return Timeline"
                                  ranges={schedule.returnRanges}
                                  kind="return"
                                  months={forecastMonths}
                                />
                              </Group>
                            </>
                          )}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
