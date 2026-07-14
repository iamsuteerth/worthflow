import {
  ActionIcon,
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";

import { Money } from "@/components/ui";
import { formatDateShort } from "@/utils/display";

interface SaveFileCardProps {
  label: string;
  networth: number;
  timeframeMonths: number;
  createdAt: string;
  onLoad?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export function SaveFileCard({
  label,
  networth,
  timeframeMonths,
  createdAt,
  onLoad,
  onDownload,
  onDelete,
  loading = false,
  isPlaceholder = false,
}: SaveFileCardProps) {
  if (isPlaceholder) {
    return (
      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Skeleton height={16} width="60%" radius="sm" />
          <Skeleton height={12} width="40%" radius="sm" />
          <Skeleton height={12} width="30%" radius="sm" />
        </Stack>
      </Card>
    );
  }

  const formattedDate = formatDateShort(createdAt);

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap={6}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text fw={600} size="sm" style={{ flex: 1 }} lineClamp={1}>
            {label}
          </Text>
          <Group gap={4} wrap="nowrap">
            <Button size="xs" variant="light" color="brand" onClick={onLoad} loading={loading}>
              Load
            </Button>
            <ActionIcon size="sm" variant="subtle" onClick={onDownload} aria-label="Download">
              <IconDownload size={14} />
            </ActionIcon>
            <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete} aria-label="Delete">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>
        <Group gap={6}>
          <Text size="xs" c="dimmed">Net worth</Text>
          <Money value={networth} compact size="xs" />
          <Text size="xs" c="dimmed">·</Text>
          <Text size="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
            {timeframeMonths} months
          </Text>
        </Group>
        <Text size="xs" c="dimmed">Saved {formattedDate}</Text>
      </Stack>
    </Card>
  );
}
