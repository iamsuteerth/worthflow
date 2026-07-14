import type { RuntimeEvent } from "@/types/runtimeEvent";
import type { MonthKey } from "@/types/simulation";

import { Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import RuntimeEventList from "@/components/scenario/RuntimeEventList";
import { usePlannerStore } from "@/store/plannerStore";

type InvestmentEventType = Extract<
  RuntimeEvent["type"],
  "ACCOUNT_AMOUNT_OVERRIDE" | "ACCOUNT_RETURN_OVERRIDE" | "INVESTMENT_DEPOSIT" | "INVESTMENT_WITHDRAWAL"
>;

const INVESTMENT_EVENT_TYPES: { type: InvestmentEventType; label: string }[] = [
  { type: "ACCOUNT_AMOUNT_OVERRIDE", label: "Amount Overrides" },
  { type: "ACCOUNT_RETURN_OVERRIDE", label: "Return Overrides" },
  { type: "INVESTMENT_DEPOSIT",      label: "Deposits" },
  { type: "INVESTMENT_WITHDRAWAL",   label: "Withdrawals" },
];

const INVESTMENT_TYPE_SET = new Set<string>(INVESTMENT_EVENT_TYPES.map((t) => t.type));

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Text
      onClick={onClick}
      size="xs"
      fw={active ? 600 : 400}
      c={active ? "brand" : "dimmed"}
      style={{
        cursor: "pointer",
        padding: "4px 10px",
        borderRadius: 999,
        border: active
          ? "1px solid var(--mantine-color-brand-5)"
          : "1px solid var(--mantine-color-default-border)",
        background: active ? "var(--mantine-color-brand-light)" : "transparent",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Text>
  );
}

function eventMonthRange(event: RuntimeEvent): [MonthKey, MonthKey] | null {
  if ("startMonth" in event && "endMonth" in event) return [event.startMonth, event.endMonth];
  if ("month" in event) return [event.month, event.month];
  return null;
}

interface Props {
  defaultAccountId?: string | null;
  typeFilter?: RuntimeEvent["type"][] | null;
  monthRange?: { start: MonthKey | null; end: MonthKey | null } | null;
}

export default function InvestmentEventGroups({ defaultAccountId = null, typeFilter = null, monthRange = null }: Props) {
  const events   = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const accounts = usePlannerStore((s) => s.config.investments.accounts);

  const [accountFilter, setAccountFilter] = useState<string | null>(defaultAccountId);
  const [appliedDefault, setAppliedDefault] = useState(defaultAccountId);

  if (defaultAccountId !== appliedDefault) {
    setAppliedDefault(defaultAccountId);
    setAccountFilter(defaultAccountId);
  }

  const inRange = (event: RuntimeEvent): boolean => {
    if (!monthRange || (!monthRange.start && !monthRange.end)) return true;
    const range = eventMonthRange(event);
    if (!range) return true;
    const [eStart, eEnd] = range;
    if (monthRange.start && eEnd < monthRange.start) return false;
    if (monthRange.end && eStart > monthRange.end) return false;
    return true;
  };

  const investmentEvents = events.filter((e) => INVESTMENT_TYPE_SET.has(e.type) && inRange(e));

  if (investmentEvents.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">No events.</Text>
    );
  }

  const accountsWithEvents = accounts.filter((account) =>
    investmentEvents.some((e) => "accountId" in e && e.accountId === account.id)
  );

  const visibleAccounts = accountFilter
    ? accountsWithEvents.filter((a) => a.id === accountFilter)
    : accountsWithEvents;

  const visibleTypes = typeFilter
    ? INVESTMENT_EVENT_TYPES.filter((t) => typeFilter.includes(t.type))
    : INVESTMENT_EVENT_TYPES;

  return (
    <Stack gap="md">
      <Group gap={6} wrap="wrap">
        <FilterChip label="All Accounts" active={accountFilter === null} onClick={() => setAccountFilter(null)} />
        {accountsWithEvents.map((account) => (
          <FilterChip
            key={account.id}
            label={account.name}
            active={accountFilter === account.id}
            onClick={() => setAccountFilter(account.id)}
          />
        ))}
      </Group>

      {visibleAccounts.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">No events for this account.</Text>
      ) : (
        visibleAccounts.map((account) => (
          <Stack key={account.id} gap="xs">
            <Text size="sm" fw={700} c="dimmed">{account.name}</Text>
            {visibleTypes.map(({ type, label }) => {
              const matching = investmentEvents.filter(
                (e) => e.type === type && "accountId" in e && e.accountId === account.id
              );
              if (matching.length === 0) return null;
              return (
                <Stack key={type} gap={4} pl="sm">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">{label}</Text>
                  <RuntimeEventList
                    filterTypes={[type]}
                    filterAccountId={account.id}
                    filterIds={matching.map((e) => e.id)}
                  />
                </Stack>
              );
            })}
          </Stack>
        ))
      )}
    </Stack>
  );
}
