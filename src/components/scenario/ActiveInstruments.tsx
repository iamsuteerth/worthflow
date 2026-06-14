// src/components/scenario/ActiveInstruments.tsx
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
import { IconBuildingBank, IconRefresh } from "@tabler/icons-react";
import { addMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { usePlannerStore } from "@/store/plannerStore";
import { money } from "@/components/tables/tableUtils";
import type { Instrument } from "@/types/instrument";

function calcMaturityValue(instrument: Instrument): {
  principal: number;
  maturityValue: number;
  interest: number;
} {
  if (instrument.type === "FD") {
    const p = instrument.principal;
    const maturityValue =
      p * Math.pow(1 + instrument.rate / 100, instrument.durationMonths / 12);
    return { principal: p, maturityValue, interest: maturityValue - p };
  } else {
    const { monthlyContribution, rate, durationMonths } = instrument;
    let maturityValue = 0;
    for (let i = 1; i <= durationMonths; i++) {
      maturityValue += monthlyContribution * Math.pow(1 + rate / 100, i / 12);
    }
    const principal = monthlyContribution * durationMonths;
    return { principal, maturityValue, interest: maturityValue - principal };
  }
}

export default function ActiveInstruments() {
  const config = usePlannerStore((state) => state.config);
  const instruments = config.instruments;

  const rows = useMemo(
    () =>
      instruments.map((instrument) => ({
        instrument,
        maturityMonth: addMonths(instrument.startMonth, instrument.durationMonths),
        ...calcMaturityValue(instrument),
      })),
    [instruments]
  );

  if (instruments.length === 0) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text size="sm" c="dimmed" ta="center">
          No active instruments
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="sm" mb="md">
      <Group justify="space-between">
        <Title order={5}>Active Instruments</Title>
        <Badge size="lg" variant="light" color="gray">
          {instruments.length}
        </Badge>
      </Group>

      {rows.map(({ instrument, maturityMonth, principal, maturityValue, interest }) => {
        const isFD = instrument.type === "FD";
        const color = isFD ? "teal" : "violet";
        const accentColor = isFD
          ? "var(--mantine-color-teal-5)"
          : "var(--mantine-color-violet-5)";

        return (
          <Card
            key={instrument.id}
            withBorder
            radius="md"
            p="md"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon variant="light" color={color} size="md" radius="md">
                  {isFD ? <IconBuildingBank size={16} /> : <IconRefresh size={16} />}
                </ThemeIcon>
                <Text fw={700}>{instrument.name}</Text>
              </Group>
              <Group gap="xs">
                <Badge color={color} variant="light" size="sm">
                  {instrument.type}
                </Badge>
                <Badge variant="light" color="green" size="sm">
                  {instrument.rate}%
                </Badge>
              </Group>
            </Group>

            <Text size="xs" c="dimmed" mb="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatMonth(instrument.startMonth)} → {formatMonth(maturityMonth)}
            </Text>

            <Divider mb="sm" />

            <SimpleGrid cols={2} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  {isFD ? "Principal" : "Total Contribution"}
                </Text>
                <Text fw={600} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(principal)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Maturity Value
                </Text>
                <Text fw={700} size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(maturityValue)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Estimated Interest
                </Text>
                <Text
                  fw={600}
                  size="sm"
                  c={interest >= 0 ? "green" : "red"}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {interest >= 0 ? "+" : "-"}{money(Math.abs(interest))}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Matures
                </Text>
                <Text fw={600} size="sm">
                  {formatMonth(maturityMonth)}
                </Text>
              </div>
            </SimpleGrid>
          </Card>
        );
      })}
    </Stack>
  );
}