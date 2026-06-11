import {
  Badge,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import {
  formatMonth,
} from "../../engine/monthFormatting";

function money(
  value: number
) {
  return (
    "₹" +
    Math.round(
      value
    ).toLocaleString()
  );
}

export default function OneOffExpensesTable() {
  const config =
    usePlannerStore(
      (state) =>
        state.config
    );

  if (
    config.oneOffExpenses
      .length === 0
  ) {
    return (
      <Paper
        withBorder
        radius="xl"
        p="xl"
      >
        <Stack
          gap={4}
          align="center"
        >
          <Text fw={600}>
            No One-Off Expenses
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Planned expenses will
            appear here.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <ScrollArea>
      <Table
      miw={400}
        striped
        highlightOnHover
        verticalSpacing="sm"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              Month
            </Table.Th>

            <Table.Th>
              Description
            </Table.Th>

            <Table.Th>
              Amount
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {config.oneOffExpenses.map(
            (expense) => (
              <Table.Tr
                key={
                  expense.id
                }
              >
                <Table.Td>
                  {formatMonth(
                    expense.month
                  )}
                </Table.Td>

                <Table.Td>
                  {
                    expense.label
                  }
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="red"
                    variant="light"
                  >
                    {money(
                      expense.amount
                    )}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            )
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}