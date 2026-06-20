import { ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { moneyParens } from "@/format/money";
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
              { label: "Cash",       value: <Money value={row.assets.cash} compact accounting />,             valueColor: row.assets.cash < 0 ? "red" : undefined },
              { label: "Investment", value: <Money value={row.assets.investmentCorpus} compact accounting />, valueColor: row.assets.investmentCorpus < 0 ? "red" : undefined },
              { label: "FD",         value: <Money value={row.assets.fdValue} compact accounting />,          valueColor: row.assets.fdValue > 0 ? "cyan" : undefined },
              { label: "RD",         value: <Money value={row.assets.rdValue} compact accounting />,          valueColor: row.assets.rdValue > 0 ? "grape" : undefined },
              { label: "Net Worth",  value: <Money value={row.assets.netWorth} compact accounting />,         emphasis: true, valueColor: row.assets.netWorth < 0 ? "red" : undefined },
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
                    {moneyParens(row.assets.cash)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text c={row.assets.investmentCorpus < 0 ? "red" : undefined}>
                    {moneyParens(row.assets.investmentCorpus)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text c={row.assets.fdValue > 0 ? "cyan" : undefined}>
                    {moneyParens(row.assets.fdValue)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text c={row.assets.rdValue > 0 ? "grape" : undefined}>
                    {moneyParens(row.assets.rdValue)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text fw={700} c={row.assets.netWorth < 0 ? "red" : undefined}>
                    {moneyParens(row.assets.netWorth)}
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
