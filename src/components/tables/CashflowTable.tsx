import { ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { money, sumEvents, netInstrumentFlow } from "@/components/tables/tableUtils";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { useIsMobile } from "@/hooks/useIsMobile";


export default function CashflowTable() {
  const result = useFilteredSimulation();
  const isMobile = useIsMobile();

  if (result.rows.length === 0) {
    return (
      <EmptyState
        title="No Cashflow Data"
        description="Cashflow projections will appear here."
      />
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {result.rows.map((row) => {
          const bonus = sumEvents(row.events, "BONUS_INCOME");
          const instrumentFlow = netInstrumentFlow(row.events);
          const investWithdrawal = sumEvents(row.events, "INVESTMENT_WITHDRAWAL");
          const netInvest = row.cashflow.investmentAmount - investWithdrawal;
          return (
            <RecordCard
              key={row.month}
              header={<Text fw={700} size="sm">{formatMonth(row.month)}</Text>}
              fields={[
                { label: "Open",        value: <Money value={row.openingBalance} compact />,  valueColor: row.openingBalance < 0 ? "red.6" : undefined },
                { label: "Income",      value: <Money value={row.cashflow.income} compact />,  valueColor: row.cashflow.income > 0 ? "teal" : row.cashflow.income < 0 ? "red" : undefined },
                { label: "Bonus",       value: <Money value={bonus} compact />,                valueColor: bonus > 0 ? "teal" : bonus < 0 ? "red" : undefined },
                { label: "Expenses",    value: <Money value={row.cashflow.flatExpense} compact />, valueColor: row.cashflow.flatExpense > 0 ? "red" : undefined },
                { label: "CC",          value: <Money value={row.cashflow.creditCardExpense} compact />, valueColor: row.cashflow.creditCardExpense > 0 ? "orange" : undefined },
                { label: "One-Off",     value: <Money value={row.cashflow.oneOffExpense} compact />, valueColor: row.cashflow.oneOffExpense > 0 ? "red" : undefined },
                { label: "Recurring",   value: <Money value={row.cashflow.recurringExpense} compact />, valueColor: row.cashflow.recurringExpense > 0 ? "red" : undefined },
                { label: "Invest",      value: <Money value={netInvest} compact />,           valueColor: netInvest > 0 ? "violet" : netInvest < 0 ? "teal" : undefined },
                { label: "Instruments", value: <Money value={instrumentFlow} compact />,       valueColor: instrumentFlow > 0 ? "teal" : instrumentFlow < 0 ? "red" : undefined },
                { label: "Close",       value: <Money value={row.closingBalance} compact />,   emphasis: true, valueColor: row.closingBalance < 0 ? "red.6" : undefined },
              ]}
            />
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
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
              const investWithdrawal = sumEvents(row.events, "INVESTMENT_WITHDRAWAL");
              const netInvest = row.cashflow.investmentAmount - investWithdrawal;

              return (
                <Table.Tr key={row.month}>
                  <Table.Td>{formatMonth(row.month)}</Table.Td>

                  <Table.Td>
                    <Text c={row.openingBalance < 0 ? "red.6" : undefined}>
                      {money(row.openingBalance)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={row.cashflow.income > 0 ? "teal" : row.cashflow.income < 0 ? "red" : undefined} fw={500}>
                      {money(row.cashflow.income)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={bonus > 0 ? "teal" : bonus < 0 ? "red" : undefined} fw={500}>
                      {money(bonus)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={row.cashflow.flatExpense > 0 ? "red" : undefined}>
                      {money(row.cashflow.flatExpense)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={row.cashflow.creditCardExpense > 0 ? "orange" : undefined}>
                      {money(row.cashflow.creditCardExpense)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={row.cashflow.oneOffExpense > 0 ? "red" : undefined}>
                      {money(row.cashflow.oneOffExpense)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={row.cashflow.recurringExpense > 0 ? "red" : undefined}>
                      {money(row.cashflow.recurringExpense)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={netInvest > 0 ? "violet" : netInvest < 0 ? "teal" : undefined}>
                      {money(netInvest)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text c={instrumentFlow > 0 ? "teal" : instrumentFlow < 0 ? "red" : undefined}>
                      {money(instrumentFlow)}
                    </Text>
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
