import {
  AppShell,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
} from "@mantine/core";

export function AppLoadingSkeleton() {
  return (
    <AppShell header={{ height: 60 }} padding="lg">
      <AppShell.Header>
        <Group justify="space-between" h="100%" px="md">
          <Group gap="sm">
            <Skeleton height={28} width={28} radius="sm" />
            <Skeleton height={22} width={110} radius="sm" />
          </Group>
          <Group gap="xs">
            <Skeleton height={28} width={28} radius="xl" />
            <Skeleton height={28} width={28} radius="xl" />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Stack gap="md">
          <Skeleton height={36} radius="md" />
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <Skeleton height={90} radius="md" />
            <Skeleton height={90} radius="md" />
            <Skeleton height={90} radius="md" />
            <Skeleton height={90} radius="md" />
          </SimpleGrid>
          <Skeleton height={280} radius="md" />
          <Skeleton height={36} width="50%" radius="md" />
          <Skeleton height={160} radius="md" />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export function ScenarioPanelSkeleton() {
  return (
    <Stack gap="sm">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} height={52} radius="md" />
      ))}
    </Stack>
  );
}

export function PageContentSkeleton() {
  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Skeleton height={90} radius="md" />
        <Skeleton height={90} radius="md" />
        <Skeleton height={90} radius="md" />
        <Skeleton height={90} radius="md" />
      </SimpleGrid>
      <Skeleton height={280} radius="md" />
      <Skeleton height={160} radius="md" />
    </Stack>
  );
}
