import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";

import { IconBuildingBank, IconPencil, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import BuilderStepContainer from "@/components/builder/BuilderStepContainer";
import EditItemModal from "@/components/builder/EditItemModal";
import {
  FdFields,
  RdFields,
  type FdDraft,
  type RdDraft,
  emptyFdDraft,
  emptyRdDraft,
  fdDraftValid,
  rdDraftValid,
} from "@/components/builder/fields/InstrumentFields";
import { forecastEndMonth } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { useBuilderStore } from "@/store/builderStore";

type Editing =
  | { id: string; kind: "FD"; draft: FdDraft }
  | { id: string; kind: "RD"; draft: RdDraft }
  | null;

export default function InstrumentsStep() {
  const state = useBuilderStore((store) => store.state);
  const addInstrument = useBuilderStore((store) => store.addInstrument);
  const updateInstrument = useBuilderStore((store) => store.updateInstrument);
  const removeInstrument = useBuilderStore((store) => store.removeInstrument);

  const forecastEnd = forecastEndMonth(state.startMonth, state.totalMonths);

  const [fdDraft, setFdDraft] = useState<FdDraft>(() => emptyFdDraft(state.startMonth));
  const [rdDraft, setRdDraft] = useState<RdDraft>(() => emptyRdDraft(state.startMonth));
  const [editing, setEditing] = useState<Editing>(null);

  const fds = state.instruments.filter((i) => i.type === "FD");
  const rds = state.instruments.filter((i) => i.type === "RD");

  function addFd() {
    addInstrument({ id: crypto.randomUUID(), ...fdDraft });
    setFdDraft(emptyFdDraft(state.startMonth));
  }
  function addRd() {
    addInstrument({ id: crypto.randomUUID(), ...rdDraft });
    setRdDraft(emptyRdDraft(state.startMonth));
  }

  function startEdit(instrument: (typeof state.instruments)[number]) {
    if (instrument.type === "FD") {
      const { id, ...draft } = instrument;
      setEditing({ id, kind: "FD", draft });
    } else {
      const { id, ...draft } = instrument;
      setEditing({ id, kind: "RD", draft });
    }
  }

  function saveEdit() {
    if (!editing) return;
    updateInstrument({ id: editing.id, ...editing.draft });
    setEditing(null);
  }

  const editValid =
    editing === null
      ? false
      : editing.kind === "FD"
      ? fdDraftValid(editing.draft)
      : rdDraftValid(editing.draft);

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
          <Card withBorder radius="md" p="lg" h="100%" style={{ borderLeft: "3px solid var(--mantine-color-cyan-5)" }}>
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
              <FdFields value={fdDraft} onChange={(patch) => setFdDraft((d) => ({ ...d, ...patch }))} maxMonth={forecastEnd} />
              <Button leftSection={<IconPlus size={16} />} color="cyan" disabled={!fdDraftValid(fdDraft)} onClick={addFd}>
                Add FD
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg" h="100%" style={{ borderLeft: "3px solid var(--mantine-color-grape-5)" }}>
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
              <RdFields value={rdDraft} onChange={(patch) => setRdDraft((d) => ({ ...d, ...patch }))} maxMonth={forecastEnd} />
              <Button leftSection={<IconPlus size={16} />} color="grape" disabled={!rdDraftValid(rdDraft)} onClick={addRd}>
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
                    <Badge variant="light" color={instrument.type === "FD" ? "cyan" : "grape"} size="sm">
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
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" aria-label="Edit" onClick={() => startEdit(instrument)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove">
                        <ActionIcon variant="subtle" color="red" aria-label="Remove" onClick={() => removeInstrument(instrument.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <EditItemModal
        opened={editing !== null}
        title={editing?.kind === "RD" ? "Edit Recurring Deposit" : "Edit Fixed Deposit"}
        canSave={editValid}
        onSave={saveEdit}
        onClose={() => setEditing(null)}
      >
        {editing?.kind === "FD" && (
          <FdFields
            value={editing.draft}
            onChange={(patch) => setEditing((e) => (e && e.kind === "FD" ? { ...e, draft: { ...e.draft, ...patch } } : e))}
            maxMonth={forecastEnd}
          />
        )}
        {editing?.kind === "RD" && (
          <RdFields
            value={editing.draft}
            onChange={(patch) => setEditing((e) => (e && e.kind === "RD" ? { ...e, draft: { ...e.draft, ...patch } } : e))}
            maxMonth={forecastEnd}
          />
        )}
      </EditItemModal>
    </BuilderStepContainer>
  );
}
