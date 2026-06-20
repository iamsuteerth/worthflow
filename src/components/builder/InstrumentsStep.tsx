import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { IconBuildingBank, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { useBuilderStore } from "@/store/builderStore";
import { forecastEndMonth } from "@/engine/dateUtils";
import type { MonthKey } from "@/types/simulation";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import BuilderStepContainer from "@/components/builder/BuilderStepContainer";

export default function InstrumentsStep() {
  const state = useBuilderStore((store) => store.state);
  const addInstrument = useBuilderStore((store) => store.addInstrument);
  const removeInstrument = useBuilderStore((store) => store.removeInstrument);

  // FD/RD may start before the forecast (pre-existing instruments, by design),
  // but never after it ends — a start beyond the horizon is silently ignored.
  const forecastEnd = forecastEndMonth(state.startMonth, state.totalMonths);

  const [fdName, setFdName] = useState("");
  const [fdPrincipal, setFdPrincipal] = useState(0);
  const [fdRate, setFdRate] = useState(0);
  const [fdDurationMonths, setFdDurationMonths] = useState(12);
  const [fdStartMonth, setFdStartMonth] = useState<MonthKey>(state.startMonth);

  const [rdName, setRdName] = useState("");
  const [rdContribution, setRdContribution] = useState(0);
  const [rdRate, setRdRate] = useState(0);
  const [rdDurationMonths, setRdDurationMonths] = useState(12);
  const [rdStartMonth, setRdStartMonth] = useState<MonthKey>(state.startMonth);

  const fds = state.instruments.filter((i) => i.type === "FD");
  const rds = state.instruments.filter((i) => i.type === "RD");

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Instruments
        </Text>
        <Text size="sm" c="dimmed">
          Add Fixed Deposits and Recurring Deposits to model guaranteed-return savings.
        </Text>
      </Stack>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            withBorder
            radius="md"
            p="lg"
            h="100%"
            style={{ borderLeft: "3px solid var(--mantine-color-cyan-5)" }}
          >
            <Group gap="xs" mb="md">
              <ThemeIcon variant="light" color="cyan" size="md" radius="md">
                <IconBuildingBank size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Fixed Deposit
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="sm">
              <TextInput
                label="Name"
                placeholder="e.g. SBI FD"
                value={fdName}
                onChange={(e) => setFdName(e.currentTarget.value)}
              />
              <NumberInput
                label="Principal"
                value={fdPrincipal}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(v) => setFdPrincipal(Number(v))}
              />
              <Grid gap="sm">
                <Grid.Col span={6}>
                  <NumberInput
                    label="Interest Rate"
                    value={fdRate}
                    min={0}
                    max={15}
                    decimalScale={2}
                    suffix="%"
                    clampBehavior="strict"
                    onChange={(v) => setFdRate(Number(v))}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Duration"
                    value={fdDurationMonths}
                    min={1}
                    max={120}
                    suffix=" mo"
                    clampBehavior="strict"
                    onChange={(v) => setFdDurationMonths(Number(v))}
                  />
                </Grid.Col>
              </Grid>
              <BuilderMonthSelect
                label="Start Month"
                value={fdStartMonth}
                maxMonth={forecastEnd}
                onChange={(value) => value && setFdStartMonth(value as MonthKey)}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                color="cyan"
                disabled={!fdName.trim() || fdPrincipal <= 0 || fdRate <= 0 || fdDurationMonths <= 0}
                onClick={() => {
                  addInstrument({
                    id: crypto.randomUUID(),
                    type: "FD",
                    name: fdName,
                    principal: fdPrincipal,
                    rate: fdRate,
                    startMonth: fdStartMonth,
                    durationMonths: fdDurationMonths,
                  });
                  setFdName("");
                  setFdPrincipal(0);
                  setFdRate(0);
                }}
              >
                Add FD
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            withBorder
            radius="md"
            p="lg"
            h="100%"
            style={{ borderLeft: "3px solid var(--mantine-color-grape-5)" }}
          >
            <Group gap="xs" mb="md">
              <ThemeIcon variant="light" color="grape" size="md" radius="md">
                <IconRefresh size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Recurring Deposit
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="sm">
              <TextInput
                label="Name"
                placeholder="e.g. Post Office RD"
                value={rdName}
                onChange={(e) => setRdName(e.currentTarget.value)}
              />
              <NumberInput
                label="Monthly Contribution"
                value={rdContribution}
                min={1}
                thousandSeparator=","
                prefix="₹"
                onChange={(v) => setRdContribution(Number(v))}
              />
              <Grid gap="sm">
                <Grid.Col span={6}>
                  <NumberInput
                    label="Interest Rate"
                    value={rdRate}
                    min={0}
                    max={15}
                    decimalScale={2}
                    suffix="%"
                    clampBehavior="strict"
                    onChange={(v) => setRdRate(Number(v))}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Duration"
                    value={rdDurationMonths}
                    min={1}
                    max={120}
                    suffix=" mo"
                    clampBehavior="strict"
                    onChange={(v) => setRdDurationMonths(Number(v))}
                  />
                </Grid.Col>
              </Grid>
              <BuilderMonthSelect
                label="Start Month"
                value={rdStartMonth}
                maxMonth={forecastEnd}
                onChange={(value) => value && setRdStartMonth(value as MonthKey)}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                color="grape"
                disabled={!rdName.trim() || rdContribution <= 0 || rdRate <= 0 || rdDurationMonths <= 0}
                onClick={() => {
                  addInstrument({
                    id: crypto.randomUUID(),
                    type: "RD",
                    name: rdName,
                    monthlyContribution: rdContribution,
                    rate: rdRate,
                    startMonth: rdStartMonth,
                    durationMonths: rdDurationMonths,
                  });
                  setRdName("");
                  setRdContribution(0);
                  setRdRate(0);
                }}
              >
                Add RD
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="sm">
            Added Instruments
          </Text>
          {state.instruments.length > 0 && (
            <Group gap="xs">
              <Badge variant="light" color="cyan" size="sm">
                {fds.length} FD{fds.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="light" color="grape" size="sm">
                {rds.length} RD{rds.length !== 1 ? "s" : ""}
              </Badge>
            </Group>
          )}
        </Group>

        {state.instruments.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No instruments added yet.
          </Text>
        ) : (
          <Table striped highlightOnHover withColumnBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Amount</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Rate</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Duration</Table.Th>
                <Table.Th>Start</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {state.instruments.map((instrument) => (
                <Table.Tr key={instrument.id}>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={instrument.type === "FD" ? "cyan" : "grape"}
                      size="sm"
                    >
                      {instrument.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{instrument.name}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {instrument.type === "FD"
                        ? money(instrument.principal)
                        : `${money(instrument.monthlyContribution)}/mo`}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {instrument.rate}%
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="sm">{instrument.durationMonths} mo</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatMonth(instrument.startMonth)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => removeInstrument(instrument.id)}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </BuilderStepContainer>
  );
}