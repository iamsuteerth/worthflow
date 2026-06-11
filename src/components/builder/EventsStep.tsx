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
  useMemo,
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

export default function EventsStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const addOneOffExpense =
    useBuilderStore(
      (store) =>
        store.addOneOffExpense
    );

  const removeOneOffExpense =
    useBuilderStore(
      (store) =>
        store.removeOneOffExpense
    );

  const addCreditCardBill =
    useBuilderStore(
      (store) =>
        store.addCreditCardBill
    );

  const removeCreditCardBill =
    useBuilderStore(
      (store) =>
        store.removeCreditCardBill
    );

  const addBonusIncome =
    useBuilderStore(
      (store) =>
        store.addBonusIncome
    );

  const removeBonusIncome =
    useBuilderStore(
      (store) =>
        store.removeBonusIncome
    );

  const addSalaryChange =
    useBuilderStore(
      (store) =>
        store.addSalaryChange
    );

  const removeSalaryChange =
    useBuilderStore(
      (store) =>
        store.removeSalaryChange
    );

  const [
    expenseMonth,
    setExpenseMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    expenseLabel,
    setExpenseLabel,
  ] =
    useState("");

  const [
    expenseAmount,
    setExpenseAmount,
  ] =
    useState(0);

  const [
    creditCardMonth,
    setCreditCardMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    creditCardLabel,
    setCreditCardLabel,
  ] =
    useState("");

  const [
    creditCardAmount,
    setCreditCardAmount,
  ] =
    useState(0);

  const [
    bonusMonth,
    setBonusMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    bonusDescription,
    setBonusDescription,
  ] =
    useState("");

  const [
    bonusAmount,
    setBonusAmount,
  ] =
    useState(0);

  const [
    salaryMonth,
    setSalaryMonth,
  ] =
    useState<MonthKey>(
      state.startMonth
    );

  const [
    salaryDescription,
    setSalaryDescription,
  ] =
    useState("");

  const [
    salaryIncome,
    setSalaryIncome,
  ] =
    useState(
      state.monthlyIncome
    );

  const timeline =
    useMemo(() => {
      const events = [
        ...state.oneOffExpenses.map(
          (
            event
          ) => ({
            id:
              event.id,

            month:
              event.month,

            type:
              "Expense",

            description:
              event.label,

            value:
              `₹${event.amount.toLocaleString()}`,
          })
        ),

        ...state.creditCardBills.map(
          (
            event
          ) => ({
            id:
              event.id,

            month:
              event.month,

            type:
              "Credit Card",

            description:
              event.label,

            value:
              `₹${event.amount.toLocaleString()}`,
          })
        ),

        ...state.bonusIncome.map(
          (
            event
          ) => ({
            id:
              event.id,

            month:
              event.month,

            type:
              "Bonus",

            description:
              event.description,

            value:
              `₹${event.amount.toLocaleString()}`,
          })
        ),

        ...state.salaryChanges.map(
          (
            event
          ) => ({
            id:
              event.id,

            month:
              event.effectiveMonth,

            type:
              "Salary Change",

            description:
              event.description,

            value:
              `₹${event.newMonthlyIncome.toLocaleString()}/month`,
          })
        ),
      ];

      return events.sort(
        (
          a,
          b
        ) =>
          a.month.localeCompare(
            b.month
          )
      );
    }, [
      state.oneOffExpenses,
      state.bonusIncome,
      state.salaryChanges,
      state.creditCardBills
    ]);

  const startMonth =
    useBuilderStore(
      (s) => s.state.startMonth
    );

  return (
    <BuilderStepContainer>
      <Card
        withBorder
      >
        <Stack>
          <Text fw={600}>
            One-Off Expense
          </Text>

          <BuilderMonthSelect
            value={
              expenseMonth
            }
            minMonth={startMonth}
            label="Month"
            onChange={(
              value
            ) =>
              value &&
              setExpenseMonth(
                value as MonthKey
              )
            }
          />

          <TextInput
            label="Label"
            value={
              expenseLabel
            }
            onChange={(
              event
            ) =>
              setExpenseLabel(
                event
                  .currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="Amount"
            value={
              expenseAmount
            }
            min={1}
            thousandSeparator=","
            onChange={(
              value
            ) =>
              setExpenseAmount(
                Number(
                  value
                )
              )
            }
          />

          <Button
            disabled={
              !expenseLabel.trim() ||
              expenseAmount <=
              0
            }
            onClick={() => {
              addOneOffExpense(
                {
                  id:
                    crypto.randomUUID(),

                  month:
                    expenseMonth,

                  label:
                    expenseLabel,

                  amount:
                    expenseAmount,
                }
              );

              setExpenseLabel(
                ""
              );

              setExpenseAmount(
                0
              );
            }}
          >
            Add Expense
          </Button>
        </Stack>
      </Card>

      <Card
        withBorder
      >
        <Stack>
          <Text fw={600}>
            Credit Card Bill
          </Text>

          <BuilderMonthSelect
            value={
              creditCardMonth
            }
            minMonth={startMonth}
            label="Month"
            onChange={(
              value
            ) =>
              value &&
              setCreditCardMonth(
                value as MonthKey
              )
            }
          />

          <TextInput
            label="Label"
            value={
              creditCardLabel
            }
            onChange={(
              event
            ) =>
              setCreditCardLabel(
                event
                  .currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="Amount"
            value={
              creditCardAmount
            }
            min={1}
            thousandSeparator=","
            onChange={(
              value
            ) =>
              setCreditCardAmount(
                Number(
                  value
                )
              )
            }
          />

          <Button
            disabled={
              !creditCardLabel.trim() ||
              creditCardAmount <= 0
            }
            onClick={() => {
              addCreditCardBill({
                id:
                  crypto.randomUUID(),

                month:
                  creditCardMonth,

                amount:
                  creditCardAmount,

                label:
                  creditCardLabel,
              });

              setCreditCardLabel(
                ""
              );

              setCreditCardAmount(
                0
              );
            }}
          >
            Add Credit Card Bill
          </Button>
        </Stack>
      </Card>

      <Card
        withBorder
      >
        <Stack>
          <Text fw={600}>
            Bonus Income
          </Text>

          <BuilderMonthSelect
            value={
              bonusMonth
            }
            minMonth={startMonth}
            label="Month"
            onChange={(
              value
            ) =>
              value &&
              setBonusMonth(
                value as MonthKey
              )
            }
          />

          <TextInput
            label="Description"
            value={
              bonusDescription
            }
            onChange={(
              event
            ) =>
              setBonusDescription(
                event
                  .currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="Amount"
            value={
              bonusAmount
            }
            min={1}
            thousandSeparator=","
            onChange={(
              value
            ) =>
              setBonusAmount(
                Number(
                  value
                )
              )
            }
          />

          <Button
            disabled={
              !bonusDescription.trim() ||
              bonusAmount <=
              0
            }
            onClick={() => {
              addBonusIncome(
                {
                  id:
                    crypto.randomUUID(),

                  month:
                    bonusMonth,

                  amount:
                    bonusAmount,

                  description:
                    bonusDescription,
                }
              );

              setBonusDescription(
                ""
              );

              setBonusAmount(
                0
              );
            }}
          >
            Add Bonus
          </Button>
        </Stack>
      </Card>

      <Card
        withBorder
      >
        <Stack>
          <Text fw={600}>
            Salary Change
          </Text>

          <BuilderMonthSelect
            value={
              salaryMonth
            }
            minMonth={startMonth}
            label="Effective Month"
            onChange={(
              value
            ) =>
              value &&
              setSalaryMonth(
                value as MonthKey
              )
            }
          />

          <TextInput
            label="Description"
            value={
              salaryDescription
            }
            onChange={(
              event
            ) =>
              setSalaryDescription(
                event
                  .currentTarget
                  .value
              )
            }
          />

          <NumberInput
            label="New Monthly Income"
            value={
              salaryIncome
            }
            min={0}
            thousandSeparator=","
            onChange={(
              value
            ) =>
              setSalaryIncome(
                Number(
                  value
                )
              )
            }
          />

          <Button
            disabled={
              !salaryDescription.trim() ||
              salaryIncome < 0
            }
            onClick={() => {
              addSalaryChange(
                {
                  id:
                    crypto.randomUUID(),

                  effectiveMonth:
                    salaryMonth,

                  newMonthlyIncome:
                    salaryIncome,

                  description:
                    salaryDescription,
                }
              );

              setSalaryDescription(
                ""
              );
            }}
          >
            Add Salary Change
          </Button>
        </Stack>
      </Card>

      <Card
        withBorder
      >
        <Stack>
          <Text fw={600}>
            Event Timeline
          </Text>

          {timeline.length ===
            0 ? (
            <Text
              size="sm"
              c="dimmed"
            >
              No events added.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    Month
                  </Table.Th>

                  <Table.Th>
                    Type
                  </Table.Th>

                  <Table.Th>
                    Description
                  </Table.Th>

                  <Table.Th>
                    Value
                  </Table.Th>

                  <Table.Th>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {timeline.map(
                  (
                    event
                  ) => (
                    <Table.Tr
                      key={
                        event.id
                      }
                    >
                      <Table.Td>
                        {formatMonth(
                          event.month
                        )}
                      </Table.Td>

                      <Table.Td>
                        {
                          event.type
                        }
                      </Table.Td>

                      <Table.Td>
                        {
                          event.description
                        }
                      </Table.Td>

                      <Table.Td>
                        {
                          event.value
                        }
                      </Table.Td>

                      <Table.Td>
                        {event.type ===
                          "Expense" && (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeOneOffExpense(
                                  event.id
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}

                        {event.type ===
                          "Credit Card" && (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeCreditCardBill(
                                  event.id
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}

                        {event.type ===
                          "Bonus" && (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeBonusIncome(
                                  event.id
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}

                        {event.type ===
                          "Salary Change" && (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeSalaryChange(
                                  event.id
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}
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