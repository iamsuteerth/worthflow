import {
  Button,
  Card,
  NumberInput,
  Table,
  Text,
} from "@mantine/core";

import {
  useState,
} from "react";

import BuilderMonthSelect
  from "./BuilderMonthSelect";

import {
  useBuilderStore,
} from "../../store/builderStore";

import type {
  MonthKey,
} from "../../types/simulation";

import BuilderStepContainer
  from "./BuilderStepContainer";
import { formatMonth } from "../../engine/monthFormatting";
import { nextMonth } from "../../engine/dateUtils";

export default function InvestmentsStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const addInvestmentRange =
    useBuilderStore(
      (store) =>
        store.addInvestmentRange
    );

  const removeInvestmentRange =
    useBuilderStore(
      (store) =>
        store.removeInvestmentRange
    );

  const startMonth =
    state
      .investmentRanges
      .length === 0
      ? state.startMonth
      : nextMonth(
        state
          .investmentRanges[
          state
            .investmentRanges
            .length - 1
        ]
          .endMonth
      ) as MonthKey;

  const [
    endMonth,
    setEndMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    amount,
    setAmount,
  ] = useState(0);

  return (
    <BuilderStepContainer>
      <Text
        size="sm"
        c="dimmed"
      >
        Add continuous monthly investment periods.
        Use ₹0 ranges if you want temporary pauses.
      </Text>

      <Text fw={500}>
        Start Month:
        {" "}
        {formatMonth(
          startMonth
        )}
      </Text>

      <BuilderMonthSelect
        value={endMonth}
        label="End Month"
        onChange={(
          value: string | null
        ) => {
          if (!value) {
            return;
          }

          setEndMonth(
            value as MonthKey
          );
        }}
      />

      <NumberInput
        label="Monthly Investment"
        value={amount}
        min={0}
        thousandSeparator=","
        onChange={(
          value
        ) =>
          setAmount(
            Number(
              value
            )
          )
        }
      />

      <Button
        fullWidth
        disabled={
          amount < 0 ||
          startMonth >
          endMonth
        }
        onClick={() => {
          addInvestmentRange({
            startMonth,
            endMonth,
            amount,
          });

          const nextStart =
            nextMonth(
              endMonth
            ) as MonthKey;

          setEndMonth(
            nextStart
          );

          setAmount(0);
        }}
      >
        Add Investment Range
      </Button>
      {state.investmentRanges
        .length === 0 && (
          <Card
            withBorder
            radius="md"
            mt="lg"
          >
            <Text
              c="dimmed"
              ta="center"
            >
              No investment ranges added yet.
            </Text>
          </Card>
        )}
      {state
        .investmentRanges
        .length > 0 && (
          <Card
            withBorder
            radius="md"
            mt="lg"
          >
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    Start
                  </Table.Th>

                  <Table.Th>
                    End
                  </Table.Th>

                  <Table.Th>
                    Monthly Amount
                  </Table.Th>

                  <Table.Th>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {state.investmentRanges.map(
                  (
                    range,
                    index
                  ) => (
                    <Table.Tr
                      key={
                        index
                      }
                    >
                      <Table.Td>
                        {
                          formatMonth(
                            range.startMonth
                          )
                        }
                      </Table.Td>

                      <Table.Td>
                        {
                          formatMonth(
                            range.endMonth
                          )
                        }
                      </Table.Td>

                      <Table.Td>
                        ₹
                        {range.amount.toLocaleString()}
                        /month
                      </Table.Td>

                      <Table.Td>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() =>
                            removeInvestmentRange(
                              index
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
          </Card>
        )}
    </BuilderStepContainer>
  );
}