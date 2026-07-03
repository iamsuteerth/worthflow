import type { ReactNode } from "react";
import type { PaperProps } from "@mantine/core";

import { Paper, Stack, Text, ThemeIcon } from "@mantine/core";

interface EmptyStateProps extends Omit<PaperProps, "children"> {
  title: string;
  description: string;
  action?: ReactNode;
  /** Optional glyph shown above the title to give the state a scannable anchor. */
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  ...paperProps
}: EmptyStateProps) {
  return (
    <Paper withBorder radius="lg" p="xl" {...paperProps}>
      <Stack align="center" gap="xs">
        {icon && (
          <ThemeIcon size={44} radius="xl" variant="light" color="brand" mb={4}>
            {icon}
          </ThemeIcon>
        )}
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
