import {
  Badge,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useMemo } from "react";
import { IconBuildingBank, IconPigMoney } from "@tabler/icons-react";
import { addMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { usePlannerStore } from "@/store/plannerStore";
import { money, moneySigned } from "@/format/money";
import { projectInstrument } from "@/engine/instrumentProjection";

export default function ActiveInstruments() {
  const config = usePlannerStore((state) => state.config);
  const instruments = config.instruments;

  const rows = useMemo(
    () =>
      instruments.map((instrument) => ({
        instrument,
        maturityMonth: addMonths(instrument.startMonth, instrument.durationMonths),
        ...projectInstrument(instrument),
      })),
    [instruments]
  );

  if (instruments.length === 0) {
    return (
      <Card withBorder radius="lg" p="lg">
        <Text size="sm" c="dimmed" ta="center">No active instruments</Text>
      </Card>
    );
  }

  return (
    <Stack gap="sm" mb="md">
      <Group justify="space-between">
        <Title order={5}>Active Instruments</Title>
        <Badge size="sm" variant="light" color="gray">{instruments.length}</Badge>
      </Group>

      {rows.map(({ instrument, maturityMonth, principal, maturityValue, interest }) => {
        const isFD = instrument.type === "FD";
        const color = isFD ? "cyan" : "grape";
        const accentVar = isFD
          ? "var(--mantine-color-cyan-5)"
          : "var(--mantine-color-grape-5)";

        return (
          <Card
            key={instrument.id}
            withBorder
            radius="lg"
            p="md"
            style={{ borderLeft: `3px solid ${accentVar}` }}
          >
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon variant="light" color={color} size="md" radius="md">
                  {isFD ? <IconBuildingBank size={16} /> : <IconPigMoney size={16} />}
                </ThemeIcon>
                <Text fw={700} size="sm">{instrument.name}</Text>
              </Group>
              <Group gap="xs">
                <Badge color={color} variant="light" size="sm">{instrument.type}</Badge>
                <Badge variant="light" color="teal" size="sm">{instrument.rate}%</Badge>
              </Group>
            </Group>

            <Text size="xs" c="dimmed" mb="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatMonth(instrument.startMonth)} → {formatMonth(maturityMonth)}
            </Text>

            <Divider mb="sm" />

            <SimpleGrid cols={2} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">{isFD ? "Principal" : "Total Contribution"}</Text>
                <Text fw={600} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(principal)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Maturity Value</Text>
                <Text fw={700} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(maturityValue)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Estimated Interest</Text>
                <Text
                  fw={600}
                  size="sm"
                  c={interest >= 0 ? "teal" : "red"}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {moneySigned(interest)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Matures</Text>
                <Text fw={600} size="sm">{formatMonth(maturityMonth)}</Text>
              </div>
            </SimpleGrid>
          </Card>
        );
      })}
    </Stack>
  );
}
