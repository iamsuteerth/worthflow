import { Badge, ScrollArea, Table } from "@mantine/core";
import { usePlannerStore } from "../../store/plannerStore";
import { formatMonth } from "../../engine/monthFormatting";
import { Emptystate } from "./Emptystate";
import { money } from "./tableUtils";

export default function OneOffExpensesTable() {
  const config = usePlannerStore((state) => state.config);

  if (config.oneOffExpenses.length === 0) {
    return (
      <Emptystate
        title="No One-Off Expenses"
        description="Planned expenses will appear here."
      />
    );
  }

  return (
    <ScrollArea>
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
                <Badge color="red" variant="light">
                  {money(expense.amount)}
                </Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}