import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";

import {
  IconTrendingUp,
} from "@tabler/icons-react";

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
  return (
    <Card
      radius="xl"
      withBorder
      bg="var(--mantine-color-body)"
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Stack gap={4}>
            <Text fw={700}>
              {title}
            </Text>

            {subtitle && (
              <Text
                size="sm"
                c="dimmed"
              >
                {subtitle}
              </Text>
            )}

            {type && (
              <Badge
                variant="light"
                color={
                  type === "FD"
                    ? "cyan"
                    : "grape"
                }
                w="fit-content"
              >
                {type}
              </Badge>
            )}
          </Stack>

          <ThemeIcon
            size="lg"
            radius="xl"
            variant="light"
            color={
              type === "FD"
                ? "cyan"
                : "grape"
            }
          >
            <IconTrendingUp
              size={18}
            />
          </ThemeIcon>
        </Group>

        <SimpleGrid cols={2}>
          <div>
            <Text
              size="xs"
              c="dimmed"
            >
              Invested
            </Text>

            <Text fw={700}>
              {principal}
            </Text>
          </div>

          <div>
            <Text
              size="xs"
              c="dimmed"
            >
              Maturity Value
            </Text>

            <Text fw={700}>
              {maturityValue}
            </Text>
          </div>

          <div>
            <Text
              size="xs"
              c="dimmed"
            >
              Profit
            </Text>

            <Text
              fw={700}
              c="green"
            >
              {interest}
            </Text>
          </div>

          <div>
            <Text
              size="xs"
              c="dimmed"
            >
              Maturity
            </Text>

            <Text fw={700}>
              {maturityMonth}
            </Text>
          </div>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}