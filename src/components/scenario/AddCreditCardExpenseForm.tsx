import {
  Button,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";

import { useState } from "react";

import { usePlannerStore }
  from "../../store/plannerStore";

import MonthSelect
  from "../common/MonthSelect";

import type { MonthKey } from "../../types/simulation";

export default function AddCreditCardExpenseForm() {
  const addCreditCardExpense =
    usePlannerStore(
      (state) =>
        state.addTransientCreditCardExpense
    );

  const [
    month,
    setMonth,
  ] = useState<
    MonthKey | null
  >(
    "2027-01"
  );

  const [
    amount,
    setAmount,
  ] = useState<number>(
    10000
  );

  const [
    label,
    setLabel,
  ] = useState("");

  return (
    <Stack>
      <MonthSelect
        value={month}
        onChange={(value) =>
          setMonth(
            value as MonthKey | null
          )
        }
      />

      <NumberInput
        label="Credit Card Amount"
        value={amount}
        min={1}
        thousandSeparator=","
        onChange={(value) =>
          setAmount(
            Number(value)
          )
        }
      />

      <TextInput
        label="Card Description"
        placeholder="HDFC Bill"
        value={label}
        onChange={(e) =>
          setLabel(
            e.currentTarget.value
          )
        }
      />

      <Button
        disabled={
          !month ||
          amount <= 0 ||
          !label.trim()
        }
        onClick={() => {
          if (
            !month
          ) {
            return;
          }

          addCreditCardExpense(
            month,
            amount,
            label.trim()
          );

          setLabel("");

          setAmount(
            10000
          );
        }}
      >
        Add Credit Card Bill
      </Button>
    </Stack>
  );
}