// src/components/scenario/InstrumentPreview.tsx
import {
  Badge,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconBuildingBank, IconRefresh } from "@tabler/icons-react";

interface Props {
  title: string;
  principal: string;
  maturityValue: string;
  interest: string;
  maturityMonth: string;
  subtitle?: string;
  type?: "FD" | "RD";
}

export default function InstrumentPreview({
  title,
  principal,
  maturityValue,
  interest,
  maturityMonth,
  subtitle,
  type,
}: Props) {
  const isFD = type === "FD";
  const color = isFD ? "teal" : "violet";
  const accentColor = isFD
    ? "var(--mantine-color-teal-5)"
    : "var(--mantine-color-violet-5)";

  return (
    <Card
      radius="md"
      withBorder
      p="md"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color={color} size="md" radius="md">
            {isFD ? <IconBuildingBank size={16} /> : <IconRefresh size={16} />}
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={700} size="sm">
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed">
                {subtitle}
              </Text>
            )}
          </Stack>
        </Group>
        {type && (
          <Badge variant="light" color={color} size="sm">
            {type}
          </Badge>
        )}
      </Group>

      <Divider mb="sm" />

      <SimpleGrid cols={2} spacing="xs">
        <div>
          <Text size="xs" c="dimmed">
            Invested
          </Text>
          <Text fw={600} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            {principal}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Maturity Value
          </Text>
          <Text fw={700} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            {maturityValue}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Estimated Profit
          </Text>
          <Text fw={600} size="sm" c="green" style={{ fontVariantNumeric: "tabular-nums" }}>
            {interest}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Matures
          </Text>
          <Text fw={600} size="sm">
            {maturityMonth}
          </Text>
        </div>
      </SimpleGrid>
    </Card>
  );
}