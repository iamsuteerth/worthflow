import { ScrollArea, Stack, Table, Text } from "@mantine/core";

import { money } from "@/components/tables/tableUtils";
import { EmptyState, RecordCard, Money } from "@/components/ui";
import { formatMonth } from "@/engine/monthFormatting";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePlannerStore } from "@/store/plannerStore";

export default function OneOffExpensesTable() {
  const config = usePlannerStore((state) => state.config);
  const isMobile = useIsMobile();

  if (config.oneOffExpenses.length === 0) {
    return (
      <EmptyState
        title="No One-Off Expenses"
        description="Planned expenses will appear here."
      />
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {config.oneOffExpenses.map((expense) => (
          <RecordCard
            key={expense.id}
            header={<Text fw={700} size="sm">{expense.label}</Text>}
            fields={[
              { label: "Month",  value: formatMonth(expense.month) },
              { label: "Amount", value: <Money value={expense.amount} compact />, valueColor: "red", emphasis: true },
            ]}
          />
        ))}
      </Stack>
    );
  }

  return (
    <ScrollArea viewportProps={{ style: { overscrollBehaviorX: "contain" } }}>
      <Table miw={400} striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Month</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {config.oneOffExpenses.map((expense) => (
            <Table.Tr key={expense.id}>
              <Table.Td>{formatMonth(expense.month)}</Table.Td>
              <Table.Td>{expense.label}</Table.Td>
              <Table.Td>
                <Text c="red">{money(expense.amount)}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
