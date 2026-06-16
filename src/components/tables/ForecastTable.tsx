import { Badge, Group, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { Emptystate } from "@/components/tables/Emptystate";
import { money } from "@/components/tables/tableUtils";

export default function ForecastTable() {
  const result = useFilteredSimulation();

  if (result.rows.length === 0) {
    return (
      <Emptystate
        title="No Forecast Data"
        description="Forecast projections will appear here."
      />
    );
  }

  return (
    <Stack gap="md">
      <Group justify="center">
        <Badge size="lg" variant="light">
          {result.rows.length} Months
        </Badge>
      </Group>

      <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
        <Table miw={1080} striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Month</Table.Th>
              <Table.Th>Cash</Table.Th>
              <Table.Th>Net Worth</Table.Th>
              <Table.Th>FD</Table.Th>
              <Table.Th>RD</Table.Th>
              <Table.Th>Events</Table.Th>
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
                  <Text fw={700} c={row.assets.netWorth < 0 ? "red" : undefined}>
                    {money(row.assets.netWorth)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Badge color="cyan" variant="light">
                    {money(row.assets.fdValue)}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge color="grape" variant="light">
                    {money(row.assets.rdValue)}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge color="blue" variant="light">
                    {row.events.length}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}