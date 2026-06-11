import {
  Badge,
  Group,
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

export default function ForecastTable() {
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
            No Forecast Data
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Forecast projections
            will appear here.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="center">
        <Badge
          size="lg"
          variant="light"
        >
          {
            result.rows.length
          } Months
        </Badge>
      </Group>

      <ScrollArea>
        <Table
          miw={600}
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
                Cash
              </Table.Th>

              <Table.Th>
                Net Worth
              </Table.Th>

              <Table.Th>
                FD
              </Table.Th>

              <Table.Th>
                RD
              </Table.Th>

              <Table.Th>
                Events
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
                    <Text fw={500}>
                      {money(
                        row.assets.cash
                      )}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text fw={700}>
                      {money(
                        row.assets
                          .netWorth
                      )}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color="cyan"
                      variant="light"
                    >
                      {money(
                        row.assets
                          .fdValue
                      )}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color="grape"
                      variant="light"
                    >
                      {money(
                        row.assets
                          .rdValue
                      )}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color="blue"
                      variant="light"
                    >
                      {
                        row.events
                          .length
                      }
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              )
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}