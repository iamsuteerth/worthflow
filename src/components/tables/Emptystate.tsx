// src/components/tables/Emptystate.tsx
import { Paper, Stack, Text } from "@mantine/core";

type EmptystateProps = {
  title: string;
  description: string;
};

export function Emptystate({ title, description }: EmptystateProps) {
  return (
    <Paper withBorder radius="xl" p="xl">
      <Stack align="center" gap={4}>
        <Text fw={600}>{title}</Text>
        <Text size="sm" c="dimmed">{description}</Text>
      </Stack>
    </Paper>
  );
}