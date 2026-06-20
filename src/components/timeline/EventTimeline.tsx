import {
  Chip,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";

import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth, formatMonthGrouped } from "@/engine/monthFormatting";
import { useFilterStore } from "@/store/filterStore";
import { EVENT_CATEGORY_LIST, getEventCategory } from "@/engine/eventCategories";
import { getEventVisual } from "@/theme/eventVisuals";
import { money } from "@/format/money";
import { EmptyState } from "@/components/ui";

const EXCLUDED_TYPES = new Set([
  "ACCOUNT_AMOUNT_OVERRIDE",
  "ACCOUNT_RETURN_OVERRIDE",
]);

export default function EventTimeline() {
  const result = useFilteredSimulation();
  const { categoryFilter, toggleCategory } = useFilterStore();

  const isVisible = (type: string) =>
    !EXCLUDED_TYPES.has(type) &&
    (categoryFilter.length === 0 ||
      categoryFilter.includes(getEventCategory(type as Parameters<typeof getEventCategory>[0])));

  const rows = result.rows.filter((row) => row.events.some((e) => isVisible(e.type)));

  return (
    <Stack gap="md">
      <Group gap={6} wrap="wrap">
        {EVENT_CATEGORY_LIST.map((category) => (
          <Chip
            key={category}
            size="xs"
            variant="light"
            checked={categoryFilter.includes(category)}
            onChange={() => toggleCategory(category)}
          >
            {category}
          </Chip>
        ))}
      </Group>

      {rows.length === 0 ? (
        <EmptyState
          title="No Timeline Events"
          description="Scenario changes and investment lifecycle events will appear here."
        />
      ) : (
        <Stack gap="lg">
          {rows.map((row) => {
            const monthEvents = row.events.filter((e) => isVisible(e.type));
            return (
              <Stack key={row.month} gap="xs">
                <Text fw={700} size="sm">{formatMonthGrouped(row.month)}</Text>
                <Timeline bulletSize={30} lineWidth={2}>
                  {monthEvents.map((event) => {
                    const { label, color, Icon } = getEventVisual(event.type);
                    return (
                      <Timeline.Item
                        key={event.id}
                        bullet={
                          <ThemeIcon size="md" radius="xl" variant="light" color={color}>
                            <Icon size={16} />
                          </ThemeIcon>
                        }
                        title={
                          <Group gap="xs" align="center">
                            <Text fw={600} size="sm">{event.description}</Text>
                            <Text size="xs" c={color} fw={500}>{label}</Text>
                          </Group>
                        }
                      >
                        <Stack gap={4} mt={4}>
                          {event.rangeEnd && (
                            <Text size="xs" c="dimmed" fw={500}>
                              Through {formatMonth(event.rangeEnd)}
                            </Text>
                          )}
                          <Text fw={700} size="lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {money(event.amount)}
                          </Text>
                        </Stack>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
