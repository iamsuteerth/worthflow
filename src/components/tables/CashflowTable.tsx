import {
  Badge,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import {
  useSimulation,
} from "../../hooks/useSimulation";

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

export default function CashflowTable() {
  const result =
    useSimulation();

  if (
    result.rows.length === 0
  ) {
    return (
      <Paper
        withBorder
        radius="xl"
        p="xl"
      >
        <Stack
          align="center"
          gap={4}
        >
          <Text fw={600}>
            No Cashflow Data
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Cashflow projections
            will appear here.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <ScrollArea>
      <Table
        miw={1080}
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
              Open
            </Table.Th>

            <Table.Th>
              Income
            </Table.Th>

            <Table.Th>
              Bonus
            </Table.Th>

            <Table.Th>
              Expenses
            </Table.Th>

            <Table.Th>
              CC
            </Table.Th>

            <Table.Th>
              One-Off
            </Table.Th>

            <Table.Th>
              Invest
            </Table.Th>

            <Table.Th>
              Instruments
            </Table.Th>

            <Table.Th>
              Close
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {result.rows.map(
            (row) => (
              <Table.Tr
                key={
                  row.month
                }
              >
                <Table.Td>
                  {formatMonth(
                    row.month
                  )}
                </Table.Td>

                <Table.Td>
                  {money(
                    row.openingBalance
                  )}
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="green"
                    variant="light"
                  >
                    {money(
                      row.cashflow
                        .income
                    )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="green"
                    variant="light"
                  >
                    {row.events
                      .filter(
                        (event) =>
                          event.type ===
                          "BONUS_INCOME"
                      )
                      .reduce(
                        (sum, event) =>
                          sum + event.amount,
                        0
                      )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="red"
                    variant="light"
                  >
                    {money(
                      row.cashflow
                        .flatExpense
                    )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="orange"
                    variant="light"
                  >
                    {money(
                      row.cashflow
                        .creditCardExpense
                    )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="red"
                    variant="outline"
                  >
                    {money(
                      row.cashflow
                        .oneOffExpense
                    )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="grape"
                    variant="light"
                  >
                    {money(
                      row.cashflow
                        .investmentAmount
                    )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color="grape"
                    variant="light"
                  >
                    {row.events
                      .filter(
                        (event) =>
                          [
                            "FD_CREATED",
                            "FD_MATURED",
                            "RD_CREATED",
                            "RD_MATURED",
                          ].includes(
                            event.type
                          )
                      )
                      .reduce(
                        (sum, event) => {
                          if (
                            event.type ===
                            "FD_CREATED" ||
                            event.type ===
                            "RD_CREATED"
                          ) {
                            return (
                              sum -
                              event.amount
                            );
                          }

                          return (
                            sum +
                            event.amount
                          );
                        },
                        0
                      )}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Text fw={700}>
                    {money(
                      row.closingBalance
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}