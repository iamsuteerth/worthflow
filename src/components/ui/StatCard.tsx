import type { ReactNode } from "react";

import {
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";

interface StatCardProps {
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
  valueColor?: string;
  negative?: boolean;
}

export function StatCard({
  title,
  value,
  sub,
  icon,
  iconColor = "brand",
  valueColor,
  negative = false,
}: StatCardProps) {
  const resolvedColor = valueColor ?? (negative ? "red.6" : undefined);

  return (
    <Card withBorder p="lg" h="100%">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" style={{ letterSpacing: "0.04em" }}>
            {title}
          </Text>
          {icon && (
            <ThemeIcon size="md" radius="xl" variant="light" color={iconColor}>
              {icon}
            </ThemeIcon>
          )}
        </Group>

        <Text
          fw={800}
          size="xl"
          c={resolvedColor}
          style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        >
          {value}
        </Text>

        {sub && (
          <Text size="xs" c="dimmed">
            {sub}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
