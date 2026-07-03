import type { RuntimeEvent } from "@/types/runtimeEvent";

import {
  ActionIcon,
  Badge,
  Card,
  Divider,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAdjustments,
  IconArrowBackUp,
  IconArrowForwardUp,
} from "@tabler/icons-react";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { getEventVisual } from "@/theme/eventVisuals";

export default function ScenarioBanner() {
  const events = usePlannerStore((s) => s.overrides.runtimeEvents) ?? [];
  const accounts = usePlannerStore((s) => s.config.investments.accounts);
  const baselineAccountIds = usePlannerStore((s) => s.baselineAccountIds);
  const deletedAccountIds = usePlannerStore((s) => s.overrides.deletedAccountIds) ?? [];

  const history = usePlannerStore((s) => s.history);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const navigateToEvents = useUiStore((s) => s.navigateToEvents);

  const newAccountCount = accounts.filter((a) => !baselineAccountIds.includes(a.id)).length;
  const removedAccountCount = deletedAccountIds.length;
  const hasChanges = events.length > 0 || newAccountCount > 0 || removedAccountCount > 0;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  if (!hasChanges && !canUndo && !canRedo) return null;

  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  return (
    <Card withBorder radius="lg" p="sm" mt="md">
      <Group justify="space-between" wrap="nowrap" mb={hasChanges ? "xs" : 0}>
        <UnstyledButton onClick={() => navigateToEvents()}>
          <Group gap="xs" wrap="nowrap">
            <IconAdjustments size={16} color="var(--mantine-color-brand-6)" />
            <Text fw={700} size="sm">Scenario Active</Text>
            {events.length > 0 && (
              <Text size="xs" c="dimmed" style={{ textDecoration: "underline" }}>
                {events.length} modification{events.length !== 1 ? "s" : ""}
              </Text>
            )}
          </Group>
        </UnstyledButton>

        <Group gap={4} wrap="nowrap">
          <Tooltip label="Undo last change" withArrow position="top">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Undo last change"
              disabled={!canUndo}
              onClick={undo}
            >
              <IconArrowBackUp size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo change" withArrow position="top">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              aria-label="Redo change"
              disabled={!canRedo}
              onClick={redo}
            >
              <IconArrowForwardUp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {hasChanges && (
        <>
          <Divider mb="xs" />

          <Group gap={6} style={{ flexWrap: "wrap" }}>
            {newAccountCount > 0 && (
              <Badge color="violet" variant="light" size="sm">
                New account ×{newAccountCount}
              </Badge>
            )}
            {removedAccountCount > 0 && (
              <Badge color="red" variant="light" size="sm">
                Removed base acc ×{removedAccountCount}
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
        </>
      )}
    </Card>
  );
}
