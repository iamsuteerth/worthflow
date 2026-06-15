// src/components/scenario/ScenarioBanner.tsx
import {
  Badge,
  Card,
  Divider,
  Group,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import type { RuntimeEvent } from "@/types/runtimeEvent";

const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  ONE_OFF_EXPENSE:            { label: "Expense",         color: "red"    },
  CREDIT_CARD_EXPENSE:        { label: "Credit Card",     color: "orange" },
  RECURRING_EXPENSE:          { label: "Recurring",       color: "red"    },
  BONUS_INCOME:               { label: "Bonus",           color: "green"  },
  SALARY_CHANGE:              { label: "Salary",          color: "blue"   },
  FD:                         { label: "FD",              color: "teal"   },
  RD:                         { label: "RD",              color: "violet" },
  ACCOUNT_AMOUNT_OVERRIDE:    { label: "Amount Override", color: "indigo" },
  ACCOUNT_RETURN_OVERRIDE:    { label: "Return Override", color: "grape"  },
  INVESTMENT_DEPOSIT:         { label: "Deposit",         color: "cyan"   },
  INVESTMENT_WITHDRAWAL:      { label: "Withdrawal",      color: "orange" },
};

export default function ScenarioBanner() {
  const events = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const accounts = usePlannerStore((s) => s.config.investments.accounts);
  const baselineAccountIds = usePlannerStore((s) => s.baselineAccountIds);
  const navigateToEvents = useUiStore((s) => s.navigateToEvents);

  const newAccountCount = accounts.filter((a) => !baselineAccountIds.includes(a.id)).length;

  if (events.length === 0 && newAccountCount === 0) return null;

  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  return (
    <Card withBorder radius="md" p="sm" mt="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap="xs">
          <IconAdjustments size={16} color="var(--mantine-color-indigo-5)" />
          <Text fw={700} size="sm">Scenario Active</Text>
        </Group>
        {events.length > 0 && (
          <UnstyledButton onClick={() => navigateToEvents()}>
            <Text size="xs" c="dimmed" style={{ textDecoration: "underline" }}>
              {events.length} modification{events.length !== 1 ? "s" : ""}
            </Text>
          </UnstyledButton>
        )}
      </Group>

      <Divider mb="xs" />

      <Group gap={6} style={{ flexWrap: "wrap" }}>
        {newAccountCount > 0 && (
          <Badge color="green" variant="light" size="sm">
            New account ×{newAccountCount}
          </Badge>
        )}
        {Object.entries(counts).map(([type, count]) => {
          const cfg = BADGE_CONFIG[type];
          if (!cfg) return null;
          return (
            <UnstyledButton
              key={type}
              onClick={() => navigateToEvents({ types: [type as RuntimeEvent["type"]] })}
              style={{ cursor: "pointer" }}
            >
              <Badge color={cfg.color} variant="light" size="sm">
                {cfg.label} ×{count}
              </Badge>
            </UnstyledButton>
          );
        })}
      </Group>
    </Card>
  );
}