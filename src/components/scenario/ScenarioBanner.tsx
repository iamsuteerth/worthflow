import { Badge, Card, Divider, Group, Text } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { usePlannerStore } from "@/store/plannerStore";

const BADGE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  ONE_OFF_EXPENSE: { label: "Expense", color: "red" },
  CREDIT_CARD_EXPENSE: { label: "Credit Card", color: "orange" },
  BONUS_INCOME: { label: "Bonus", color: "green" },
  SALARY_CHANGE: { label: "Salary", color: "blue" },
  FD: { label: "FD", color: "teal" },
  RD: { label: "RD", color: "violet" },
  INVESTMENT_OVERRIDE: { label: "Inv. Override", color: "indigo" },
  INVESTMENT_RETURN_OVERRIDE: { label: "Return Override", color: "grape" },
  INVESTMENT_DEPOSIT: { label: "Deposit", color: "cyan" },
  INVESTMENT_WITHDRAWAL: { label: "Withdrawal", color: "orange" },
};

export default function ScenarioBanner() {
  const events = usePlannerStore((state) => state.overrides.runtimeEvents) ?? [];

  if (events.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  return (
    <Card withBorder radius="md" p="sm" mt="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap="xs">
          <IconAdjustments size={16} color="var(--mantine-color-indigo-5)" />
          <Text fw={700} size="sm">
            Scenario Active
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {events.length} modification{events.length !== 1 ? "s" : ""}
        </Text>
      </Group>

      <Divider mb="xs" />

      <Group gap={6} style={{ flexWrap: "wrap" }}>
        {Object.entries(counts).map(([type, count]) => {
          const cfg = BADGE_CONFIG[type];
          if (!cfg) return null;
          return (
            <Badge key={type} color={cfg.color} variant="light" size="sm">
              {cfg.label} ×{count}
            </Badge>
          );
        })}
      </Group>
    </Card>
  );
}