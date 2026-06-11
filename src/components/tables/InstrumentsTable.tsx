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
  addMonths,
} from "../../engine/dateUtils";

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

export default function InstrumentsTable() {
  const config =
    usePlannerStore(
      (state) =>
        state.config
    );

  if (
    config.instruments.length === 0
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
            No Instruments Yet
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            Create an FD or RD from
            the Scenario Lab.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <ScrollArea>
      <Table
        miw={750}
        striped
        highlightOnHover
        verticalSpacing="sm"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              Name
            </Table.Th>

            <Table.Th>
              Type
            </Table.Th>

            <Table.Th>
              Rate
            </Table.Th>

            <Table.Th>
              Duration
            </Table.Th>

            <Table.Th>
              Start
            </Table.Th>

            <Table.Th>
              Maturity
            </Table.Th>

            <Table.Th>
              Principal
            </Table.Th>

            <Table.Th>
              Interest
            </Table.Th>

            <Table.Th>
              Value
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {config.instruments.map(
            (
              instrument
            ) => {
              const maturity =
                addMonths(
                  instrument.startMonth,
                  instrument.durationMonths
                );

              const principal =
                instrument.type ===
                  "FD"
                  ? instrument.principal
                  : instrument.monthlyContribution *
                  instrument.durationMonths;

              const maturityValue =
                principal *
                Math.pow(
                  1 +
                  instrument.rate /
                  100,
                  instrument.durationMonths /
                  12
                );

              const interest =
                maturityValue -
                principal;

              return (
                <Table.Tr
                  key={
                    instrument.id
                  }
                >
                  <Table.Td>
                    {
                      instrument.name
                    }
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color={
                        instrument.type ===
                          "FD"
                          ? "cyan"
                          : "grape"
                      }
                      variant="light"
                    >
                      {
                        instrument.type
                      }
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    {
                      instrument.rate
                    }
                    %
                  </Table.Td>

                  <Table.Td>
                    {
                      instrument.durationMonths
                    }{" "}
                    Months
                  </Table.Td>

                  <Table.Td>
                    {formatMonth(
                      instrument.startMonth
                    )}
                  </Table.Td>

                  <Table.Td>
                    {formatMonth(
                      maturity
                    )}
                  </Table.Td>

                  <Table.Td>
                    {money(
                      principal
                    )}
                  </Table.Td>

                  <Table.Td>
                    <Text
                      c="green"
                    >
                      {money(
                        interest
                      )}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text
                      fw={700}
                    >
                      {money(
                        maturityValue
                      )}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            }
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}