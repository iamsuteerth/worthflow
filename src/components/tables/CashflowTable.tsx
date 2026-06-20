import { ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useFilteredSimulation } from "@/hooks/useFilteredSimulation";
import { formatMonth } from "@/engine/monthFormatting";
import { sumEvents } from "@/components/tables/tableUtils";
import { moneyParens } from "@/format/money";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { useIsMobile } from "@/hooks/useIsMobile";

// Derives the per-row cashflow columns with accounting signs: outflows negative,
// inflows positive. Colors: red/orange for "hurting" spend, green for cash in,
// neutral for money moved into investments/instruments (deposits, contributions).
function cashflowColumns(row: ReturnType<typeof useFilteredSimulation>["rows"][number]) {
  const c = row.cashflow;
  const bonus = sumEvents(row.events, "BONUS_INCOME");
  const salary = c.income - bonus;

  return {
    open:       { value: row.openingBalance, color: row.openingBalance < 0 ? "red.6" : undefined },
    income:     { value: salary,             color: salary > 0 ? "teal" : undefined },
    bonus:      { value: bonus,              color: bonus > 0 ? "teal" : undefined },
    expenses:   { value: -c.flatExpense,     color: c.flatExpense > 0 ? "red" : undefined },
    cc:         { value: -c.creditCardExpense, color: c.creditCardExpense > 0 ? "red" : undefined },
    oneOff:     { value: -c.oneOffExpense,   color: c.oneOffExpense > 0 ? "red" : undefined },
    recurring:  { value: -c.recurringExpense, color: c.recurringExpense > 0 ? "red" : undefined },
    invest:     { value: -c.investmentAmount, color: c.investmentAmount > 0 ? "violet" : undefined },
    proceeds:   { value: c.proceeds,         color: c.proceeds > 0 ? "teal" : c.proceeds < 0 ? "orange" : undefined }, // withdrawal teal, deposit orange
    instruments:{ value: c.instrumentFlow,   color: c.instrumentFlow > 0 ? "teal" : c.instrumentFlow < 0 ? "red" : undefined },
    close:      { value: row.closingBalance, color: row.closingBalance < 0 ? "red.6" : undefined },
  };
}

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
          const col = cashflowColumns(row);
          return (
            <RecordCard
              key={row.month}
              header={<Text fw={700} size="sm">{formatMonth(row.month)}</Text>}
              fields={[
                { label: "Open",        value: <Money value={col.open.value} compact accounting />,        valueColor: col.open.color },
                { label: "Income",      value: <Money value={col.income.value} compact accounting />,      valueColor: col.income.color },
                { label: "Bonus",       value: <Money value={col.bonus.value} compact accounting />,       valueColor: col.bonus.color },
                { label: "Expenses",    value: <Money value={col.expenses.value} compact accounting />,    valueColor: col.expenses.color },
                { label: "CC",          value: <Money value={col.cc.value} compact accounting />,          valueColor: col.cc.color },
                { label: "One-Off",     value: <Money value={col.oneOff.value} compact accounting />,      valueColor: col.oneOff.color },
                { label: "Recurring",   value: <Money value={col.recurring.value} compact accounting />,   valueColor: col.recurring.color },
                { label: "Invest",      value: <Money value={col.invest.value} compact accounting />,      valueColor: col.invest.color },
                { label: "Proceeds",    value: <Money value={col.proceeds.value} compact accounting />,    valueColor: col.proceeds.color },
                { label: "Instruments", value: <Money value={col.instruments.value} compact accounting />, valueColor: col.instruments.color },
                { label: "Close",       value: <Money value={col.close.value} compact accounting />,       emphasis: true, valueColor: col.close.color },
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
        <Table miw={1500} striped highlightOnHover verticalSpacing="sm">
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
              <Table.Th>Proceeds</Table.Th>
              <Table.Th>Instruments</Table.Th>
              <Table.Th>Close</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {result.rows.map((row) => {
              const col = cashflowColumns(row);
              return (
                <Table.Tr key={row.month}>
                  <Table.Td>{formatMonth(row.month)}</Table.Td>
                  <Table.Td><Text c={col.open.color}>{moneyParens(col.open.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.income.color} fw={500}>{moneyParens(col.income.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.bonus.color} fw={500}>{moneyParens(col.bonus.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.expenses.color}>{moneyParens(col.expenses.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.cc.color}>{moneyParens(col.cc.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.oneOff.color}>{moneyParens(col.oneOff.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.recurring.color}>{moneyParens(col.recurring.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.invest.color}>{moneyParens(col.invest.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.proceeds.color}>{moneyParens(col.proceeds.value)}</Text></Table.Td>
                  <Table.Td><Text c={col.instruments.color}>{moneyParens(col.instruments.value)}</Text></Table.Td>
                  <Table.Td><Text fw={700} c={col.close.color}>{moneyParens(col.close.value)}</Text></Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
