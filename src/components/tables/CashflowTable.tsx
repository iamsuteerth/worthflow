// src/components/tables/CashflowTable.tsx
import { Badge, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { money, sumEvents, netInstrumentFlow } from "@/components/tables/tableUtils";
import { Emptystate } from "@/components/tables/Emptystate";

export default function CashflowTable() {
  const result = useFilteredSimulation();

  if (result.rows.length === 0) {
    return (
      <Emptystate
        title="No Cashflow Data"
        description="Cashflow projections will appear here."
      />
    );
  }

  return (
    <Stack gap="md">
      <ScrollArea>
        <Table miw={1400} striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Month</Table.Th>
              <Table.Th>Open</Table.Th>
              <Table.Th>Income</Table.Th>
              <Table.Th>Bonus</Table.Th>
              <Table.Th>Expenses</Table.Th>
              <Table.Th>CC</Table.Th>
              <Table.Th>One-Off</Table.Th>
              <Table.Th>Recurring</Table.Th>
              <Table.Th>Invest</Table.Th>
              <Table.Th>Instruments</Table.Th>
              <Table.Th>Close</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {result.rows.map((row) => {
              const bonus = sumEvents(row.events, "BONUS_INCOME");
              const instrumentFlow = netInstrumentFlow(row.events);

              return (
                <Table.Tr key={row.month}>
                  <Table.Td>{formatMonth(row.month)}</Table.Td>

                  <Table.Td>
                    <Text c={row.openingBalance < 0 ? "red.6" : undefined}>
                      {money(row.openingBalance)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="green" variant="light">
                      {money(row.cashflow.income)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="green" variant="light">
                      {money(bonus)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="red" variant="light">
                      {money(row.cashflow.flatExpense)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="orange" variant="light">
                      {money(row.cashflow.creditCardExpense)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="red" variant="outline">
                      {money(row.cashflow.oneOffExpense)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="red" variant="dot">
                      {money(row.cashflow.recurringExpense)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="grape" variant="light">
                      {money(row.cashflow.investmentAmount)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color="grape" variant="light">
                      {money(instrumentFlow)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Text fw={700} c={row.closingBalance < 0 ? "red.6" : undefined}>
                      {money(row.closingBalance)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}