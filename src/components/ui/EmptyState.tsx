import type { ReactNode } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import type { PaperProps } from "@mantine/core";

interface EmptyStateProps extends Omit<PaperProps, "children"> {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  ...paperProps
}: EmptyStateProps) {
  return (
    <Paper withBorder radius="lg" p="xl" {...paperProps}>
      <Stack align="center" gap="xs">
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          {description}
        </Text>
        {action}
      </Stack>
    </Paper>
  );
}
