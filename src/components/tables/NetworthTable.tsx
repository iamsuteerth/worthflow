import { ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { money } from "@/components/tables/tableUtils";
import { useIsMobile } from "@/hooks/useIsMobile";


export default function NetWorthTable() {
  const result = useFilteredSimulation();
  const isMobile = useIsMobile();

  if (result.rows.length === 0) {
    return (
      <EmptyState
        title="No Net Worth Data"
        description="Net worth projections will appear here."
      />
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {result.rows.map((row) => (
          <RecordCard
            key={row.month}
            header={<Text fw={700} size="sm">{formatMonth(row.month)}</Text>}
            fields={[
              { label: "Cash",       value: <Money value={row.assets.cash} compact />,             valueColor: row.assets.cash < 0 ? "red" : undefined },
              { label: "Investment", value: <Money value={row.assets.investmentCorpus} compact /> },
              { label: "FD",         value: <Money value={row.assets.fdValue} compact />,          valueColor: row.assets.fdValue > 0 ? "cyan" : undefined },
              { label: "RD",         value: <Money value={row.assets.rdValue} compact />,          valueColor: row.assets.rdValue > 0 ? "grape" : undefined },
              { label: "Net Worth",  value: <Money value={row.assets.netWorth} compact />,         emphasis: true, valueColor: row.assets.netWorth < 0 ? "red" : undefined },
            ]}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
        <Table miw={840} striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Month</Table.Th>
              <Table.Th>Cash</Table.Th>
              <Table.Th>Investment</Table.Th>
              <Table.Th>FD</Table.Th>
              <Table.Th>RD</Table.Th>
              <Table.Th>Net Worth</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {result.rows.map((row) => (
              <Table.Tr key={row.month}>
                <Table.Td>{formatMonth(row.month)}</Table.Td>

                <Table.Td>
                  <Text fw={500} c={row.assets.cash < 0 ? "red" : undefined}>
                    {money(row.assets.cash)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text>{money(row.assets.investmentCorpus)}</Text>
                </Table.Td>

                <Table.Td>
                  <Text c={row.assets.fdValue > 0 ? "cyan" : undefined}>
                    {money(row.assets.fdValue)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text c={row.assets.rdValue > 0 ? "grape" : undefined}>
                    {money(row.assets.rdValue)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text fw={700} c={row.assets.netWorth < 0 ? "red" : undefined}>
                    {money(row.assets.netWorth)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
