import type { ReactNode } from "react";

import { Card, Group, Stack, Text } from "@mantine/core";

export interface RecordField {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  valueColor?: string;
}

interface RecordCardProps {
  fields: RecordField[];
  header?: ReactNode;
  actions?: ReactNode;
  highlighted?: boolean;
}

export function RecordCard({
  fields,
  header,
  actions,
  highlighted = false,
}: RecordCardProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={
        highlighted
          ? { borderColor: "var(--mantine-primary-color-filled)" }
          : undefined
      }
    >
      {(header || actions) && (
        <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
          <div style={{ minWidth: 0 }}>{header}</div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </Group>
      )}

      <Stack gap={6}>
        {fields.map((field, i) => (
          <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {field.label}
            </Text>
            <Text
              size="sm"
              fw={field.emphasis ? 700 : 500}
              c={field.valueColor}
              ta="right"
              style={{ minWidth: 0, fontVariantNumeric: "tabular-nums" }}
            >
              {field.value}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
