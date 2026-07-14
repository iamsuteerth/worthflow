import { Badge, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useMemo } from "react";

import { money } from "@/components/tables/tableUtils";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { addMonths } from "@/engine/dateUtils";
import { projectInstrument } from "@/engine/instrumentProjection";
import { formatMonth } from "@/engine/monthFormatting";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFilterStore } from "@/store/filterStore";
import { usePlannerStore } from "@/store/plannerStore";

export default function InstrumentsTable() {
  const config = usePlannerStore((state) => state.config);
  const isMobile = useIsMobile();

  const { startMonth, endMonth } = useFilterStore();

  const instrumentRows = useMemo(
    () =>
      config.instruments.map((instrument) => ({
        instrument,
        maturity: addMonths(instrument.startMonth, instrument.durationMonths),
        ...projectInstrument(instrument),
      })),
    [config.instruments]
  );

  // Overlap filter: show instruments whose start→maturity span intersects the
  // active month range (keeps historic-but-still-running instruments visible).
  const visibleRows = useMemo(
    () =>
      instrumentRows.filter(({ instrument, maturity }) => {
        if (startMonth && maturity < startMonth) return false;
        if (endMonth && instrument.startMonth > endMonth) return false;
        return true;
      }),
    [instrumentRows, startMonth, endMonth]
  );

  if (config.instruments.length === 0) {
    return (
      <EmptyState
        title="No Instruments Yet"
        description="Create an FD or RD from the Scenario Lab."
      />
    );
  }

  if (visibleRows.length === 0) {
    return (
      <EmptyState
        title="No Instruments In Range"
        description="No FDs or RDs are active in the selected month range."
      />
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {visibleRows.map(({ instrument, maturity, principal, maturityValue, interest }) => (
          <RecordCard
            key={instrument.id}
            header={
              <Text fw={700} size="sm">
                {instrument.name}{" "}
                <Badge color={instrument.type === "FD" ? "cyan" : "grape"} variant="light" size="xs">
                  {instrument.type}
                </Badge>
              </Text>
            }
            fields={[
              { label: "Rate",      value: `${instrument.rate}%` },
              { label: "Duration",  value: `${instrument.durationMonths} months` },
              { label: "Start",     value: formatMonth(instrument.startMonth) },
              { label: "Matures",   value: formatMonth(maturity) },
              { label: "Principal", value: <Money value={principal} compact /> },
              { label: "Interest",  value: <Money value={interest} compact />, valueColor: "teal" },
              { label: "Value",     value: <Money value={maturityValue} compact />, emphasis: true },
            ]}
          />
        ))}
      </Stack>
    );
  }

  return (
    <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
      <Table miw={750} striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Rate</Table.Th>
            <Table.Th>Duration</Table.Th>
            <Table.Th>Start</Table.Th>
            <Table.Th>Maturity</Table.Th>
            <Table.Th>Principal</Table.Th>
            <Table.Th>Interest</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {visibleRows.map(({ instrument, maturity, principal, maturityValue, interest }) => (
            <Table.Tr key={instrument.id}>
              <Table.Td>{instrument.name}</Table.Td>

              <Table.Td>
                <Badge
                  color={instrument.type === "FD" ? "cyan" : "grape"}
                  variant="light"
                >
                  {instrument.type}
                </Badge>
              </Table.Td>

              <Table.Td>{instrument.rate}%</Table.Td>
              <Table.Td>{instrument.durationMonths} months</Table.Td>
              <Table.Td>{formatMonth(instrument.startMonth)}</Table.Td>
              <Table.Td>{formatMonth(maturity)}</Table.Td>
              <Table.Td>{money(principal)}</Table.Td>

              <Table.Td>
                <Text c="teal">{money(interest)}</Text>
              </Table.Td>

              <Table.Td>
                <Text fw={700}>{money(maturityValue)}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
