import {
  Group,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonthGrouped } from "@/engine/monthFormatting";
import { getEventVisual } from "@/theme/eventVisuals";
import { EmptyState, AdaptiveMoney } from "@/components/ui";

const INVESTMENT_TYPES = new Set([
  "ACCOUNT_CREATED",
  "ACCOUNT_AMOUNT_OVERRIDE",
  "ACCOUNT_RETURN_OVERRIDE",
  "INVESTMENT_DEPOSIT",
  "INVESTMENT_WITHDRAWAL",
]);

export default function InvestmentTimeline() {
  const result = useFilteredSimulation();

  const rows = result.rows.filter((row) =>
    row.events.some((e) => INVESTMENT_TYPES.has(e.type))
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No Investment Events"
        description="Account deposits, withdrawals, and overrides will appear here."
      />
    );
  }

  return (
    <Stack gap="lg">
      {rows.map((row) => {
        const monthEvents = row.events.filter((e) => INVESTMENT_TYPES.has(e.type));
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
                      <Group gap="xs">
                        <Text fw={600} size="sm">{event.description}</Text>
                        <Text size="xs" c={color} fw={500}>{label}</Text>
                      </Group>
                    }
                  >
                    <Stack gap={4} mt={4}>
                      <Text fw={700} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {event.type === "ACCOUNT_RETURN_OVERRIDE" ? (
                          `${event.amount.toFixed(2)}%`
                        ) : event.type === "ACCOUNT_CREATED" ? (
                          event.amount > 0 ? (
                            <>
                              <Text span size="xs" c="dimmed">Opening </Text>
                              <AdaptiveMoney value={event.amount} />
                            </>
                          ) : (
                            "Opened"
                          )
                        ) : (
                          <AdaptiveMoney value={event.amount} />
                        )}
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
  );
}
