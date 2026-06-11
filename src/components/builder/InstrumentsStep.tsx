import {
  Button,
  Card,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";

import {
  useState,
} from "react";

import BuilderMonthSelect
  from "./BuilderMonthSelect";

import BuilderStepContainer
  from "./BuilderStepContainer";

import {
  useBuilderStore,
} from "../../store/builderStore";

import type {
  MonthKey,
} from "../../types/simulation";

import {
  formatMonth,
} from "../../engine/monthFormatting";

export default function InstrumentsStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const addInstrument =
    useBuilderStore(
      (store) =>
        store.addInstrument
    );

  const removeInstrument =
    useBuilderStore(
      (store) =>
        store.removeInstrument
    );

  const [
    fdName,
    setFdName,
  ] = useState("");

  const [
    fdPrincipal,
    setFdPrincipal,
  ] = useState(0);

  const [
    fdRate,
    setFdRate,
  ] = useState(0);

  const [
    fdDurationMonths,
    setFdDurationMonths,
  ] = useState(12);

  const [
    fdStartMonth,
    setFdStartMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    rdName,
    setRdName,
  ] = useState("");

  const [
    rdContribution,
    setRdContribution,
  ] = useState(0);

  const [
    rdRate,
    setRdRate,
  ] = useState(0);

  const [
    rdDurationMonths,
    setRdDurationMonths,
  ] = useState(12);

  const [
    rdStartMonth,
    setRdStartMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  return (
    <BuilderStepContainer>
      <Card withBorder>
        <Stack>
          <Text fw={600}>
            Fixed Deposit
          </Text>

          <TextInput
            label="Name"
            value={fdName}
            onChange={(e) =>
              setFdName(
                e.currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="Principal"
            value={fdPrincipal}
            min={1}
            thousandSeparator=","
            onChange={(v) =>
              setFdPrincipal(
                Number(v)
              )
            }
          />

          <NumberInput
            label="Interest Rate (%)"
            value={fdRate}
            min={0}
            max={15}
            decimalScale={2}
            clampBehavior="strict"
            onChange={(v) =>
              setFdRate(
                Number(v)
              )
            }
          />

          <BuilderMonthSelect
            label="Start Month"
            value={fdStartMonth}
            onChange={(
              value
            ) =>
              value &&
              setFdStartMonth(
                value as MonthKey
              )
            }
          />

          <NumberInput
            label="Duration (Months)"
            value={
              fdDurationMonths
            }
            min={1}
            max={120}
            clampBehavior="strict"
            onChange={(v) =>
              setFdDurationMonths(
                Number(v)
              )
            }
          />

          <Button
            disabled={
              !fdName.trim() ||
              fdPrincipal <=
              0 ||
              fdRate <= 0 ||
              fdDurationMonths <=
              0
            }
            onClick={() => {
              addInstrument({
                id:
                  crypto.randomUUID(),
                type: "FD",
                name: fdName,
                principal:
                  fdPrincipal,
                rate: fdRate,
                startMonth:
                  fdStartMonth,
                durationMonths:
                  fdDurationMonths,
              });

              setFdName("");
              setFdPrincipal(
                0
              );
              setFdRate(0);
            }}
          >
            Add FD
          </Button>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Text fw={600}>
            Recurring Deposit
          </Text>

          <TextInput
            label="Name"
            value={rdName}
            onChange={(e) =>
              setRdName(
                e.currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="Monthly Contribution"
            value={
              rdContribution
            }
            min={1}
            thousandSeparator=","
            onChange={(v) =>
              setRdContribution(
                Number(v)
              )
            }
          />

          <NumberInput
            label="Interest Rate (%)"
            value={rdRate}
            min={0}
            max={15}
            decimalScale={2}
            clampBehavior="strict"
            onChange={(v) =>
              setRdRate(
                Number(v)
              )
            }
          />

          <BuilderMonthSelect
            label="Start Month"
            value={rdStartMonth}
            onChange={(
              value
            ) =>
              value &&
              setRdStartMonth(
                value as MonthKey
              )
            }
          />

          <NumberInput
            label="Duration (Months)"
            value={
              rdDurationMonths
            }
            min={1}
            max={120}
            clampBehavior="strict"
            onChange={(v) =>
              setRdDurationMonths(
                Number(v)
              )
            }
          />

          <Button
            disabled={
              !rdName.trim() ||
              rdContribution <=
              0 ||
              rdRate <= 0 ||
              rdDurationMonths <=
              0
            }
            onClick={() => {
              addInstrument({
                id:
                  crypto.randomUUID(),
                type: "RD",
                name: rdName,
                monthlyContribution:
                  rdContribution,
                rate: rdRate,
                startMonth:
                  rdStartMonth,
                durationMonths:
                  rdDurationMonths,
              });

              setRdName("");
              setRdContribution(
                0
              );
              setRdRate(0);
            }}
          >
            Add RD
          </Button>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Text fw={600}>
            Instruments
          </Text>

          {state
            .instruments
            .length ===
            0 ? (
            <Text
              c="dimmed"
            >
              No instruments
              added.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    Type
                  </Table.Th>
                  <Table.Th>
                    Name
                  </Table.Th>
                  <Table.Th>
                    Amount
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
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {state.instruments.map(
                  (
                    instrument
                  ) => (
                    <Table.Tr
                      key={
                        instrument.id
                      }
                    >
                      <Table.Td>
                        {
                          instrument.type
                        }
                      </Table.Td>

                      <Table.Td>
                        {
                          instrument.name
                        }
                      </Table.Td>

                      <Table.Td>
                        {instrument.type ===
                          "FD"
                          ? `₹${instrument.principal.toLocaleString()}`
                          : `₹${instrument.monthlyContribution.toLocaleString()}/month`}
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
                        }
                      </Table.Td>

                      <Table.Td>
                        {formatMonth(
                          instrument.startMonth
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() =>
                            removeInstrument(
                              instrument.id
                            )
                          }
                        >
                          Remove
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  )
                )}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </BuilderStepContainer>
  );
}