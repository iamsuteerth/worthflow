import {
  Badge,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import {
  addMonths,
} from "../../engine/dateUtils";

import {
  formatMonth,
} from "../../engine/monthFormatting";

export default function ActiveInstruments() {
  const config =
    usePlannerStore(
      (state) => state.config
    );

  const instruments =
    config.instruments;

  if (
    instruments.length === 0
  ) {
    return (
      <Card
        withBorder
        radius="xl"
        p="lg"
      >
        <Text c="dimmed">
          No active instruments
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="sm" mb="md">
      <Group
        justify="space-between"
      >
        <Title order={5}>
          Active Instruments
        </Title>

        <Badge
          size="lg"
          variant="light"
        >
          {
            instruments.length
          }
        </Badge>
      </Group>

      {instruments.map(
        (instrument) => {
          const maturityMonth =
            addMonths(
              instrument.startMonth,
              instrument.durationMonths
            );

          const principal =
            instrument.type === "FD"
              ? instrument.principal
              : instrument.monthlyContribution *
              instrument.durationMonths;

          const maturityValue =
            principal *
            Math.pow(
              1 +
              instrument.rate /
              100,
              instrument.type === "FD"
                ? instrument
                  .durationMonths /
                12
                : instrument
                  .durationMonths /
                24
            );

          const interest =
            maturityValue -
            principal;

          return (
            <Card
              key={
                instrument.id
              }
              withBorder
              radius="xl"
              shadow="xs"
              p="md"
            >
              <Group
                justify="space-between"
                mb="xs"
              >
                <Text fw={700}>
                  {
                    instrument.name
                  }
                </Text>

                <Badge
                  color={
                    instrument.type ===
                      "FD"
                      ? "blue"
                      : "violet"
                  }
                >
                  {
                    instrument.type
                  }
                </Badge>
              </Group>

              <Text
                size="sm"
                c="dimmed"
              >
                {
                  formatMonth(
                    instrument.startMonth
                  )
                }
                {" → "}
                {
                  formatMonth(
                    maturityMonth
                  )
                }
              </Text>

              <Text
                mt="sm"
                fw={600}
              >
                ₹
                {Math.round(
                  principal
                ).toLocaleString()}
                {" → "}
                ₹
                {Math.round(
                  maturityValue
                ).toLocaleString()}
              </Text>

              <Text
                size="sm"
                c="green"
              >
                +
                ₹
                {Math.round(
                  interest
                ).toLocaleString()}
              </Text>
            </Card>
          );
        }
      )}
    </Stack>
  );
}