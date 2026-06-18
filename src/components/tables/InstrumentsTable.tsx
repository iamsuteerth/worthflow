import { Badge, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { usePlannerStore } from "@/store/plannerStore";
import { addMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { money } from "@/components/tables/tableUtils";
import { useIsMobile } from "@/hooks/useIsMobile";
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

export default function InstrumentsTable() {
  const config = usePlannerStore((state) => state.config);
  const isMobile = useIsMobile();

  const instrumentRows = useMemo(
    () =>
      config.instruments.map((instrument) => ({
        instrument,
        maturity: addMonths(instrument.startMonth, instrument.durationMonths),
        ...calcMaturityValue(instrument),
      })),
    [config.instruments]
  );

  if (config.instruments.length === 0) {
    return (
      <EmptyState
        title="No Instruments Yet"
        description="Create an FD or RD from the Scenario Lab."
      />
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {instrumentRows.map(({ instrument, maturity, principal, maturityValue, interest }) => (
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
          {instrumentRows.map(({ instrument, maturity, principal, maturityValue, interest }) => (
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
