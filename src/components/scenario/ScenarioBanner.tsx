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
import { getEventVisual } from "@/theme/eventVisuals";
import type { RuntimeEvent } from "@/types/runtimeEvent";

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
    <Card withBorder radius="lg" p="sm" mt="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <Group gap="xs">
          <IconAdjustments size={16} color="var(--mantine-color-brand-6)" />
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
          <Badge color="violet" variant="light" size="sm">
            New account ×{newAccountCount}
          </Badge>
        )}
        {Object.entries(counts).map(([type, count]) => {
          const { label, color } = getEventVisual(type);
          return (
            <UnstyledButton
              key={type}
              onClick={() => navigateToEvents({ types: [type as RuntimeEvent["type"]] })}
              style={{ cursor: "pointer" }}
            >
              <Badge color={color} variant="light" size="sm">
                {label} ×{count}
              </Badge>
            </UnstyledButton>
          );
        })}
      </Group>
    </Card>
  );
}
