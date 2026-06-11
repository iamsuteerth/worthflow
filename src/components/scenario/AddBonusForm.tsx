import {
  Button,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";

import { useState } from "react";

import type {
  MonthKey,
} from "../../types/simulation";

import MonthSelect
  from "../common/MonthSelect";

import {
  usePlannerStore,
} from "../../store/plannerStore";

export default function AddBonusForm() {
  const addBonus =
    usePlannerStore(
      (state) =>
        state.addTransientBonusIncome
    );

  const [
    month,
    setMonth,
  ] = useState<
    MonthKey | null
  >("2028-01");

  const [
    amount,
    setAmount,
  ] = useState(
    50000
  );

  const [
    description,
    setDescription,
  ] = useState("");

  return (
    <Stack>
      <MonthSelect
        value={month}
        onChange={(value) =>
          setMonth(
            value as
              | MonthKey
              | null
          )
        }
      />

      <NumberInput
        label="Bonus Amount"
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
        label="Description"
        placeholder="Performance Bonus"
        value={
          description
        }
        onChange={(e) =>
          setDescription(
            e.currentTarget
              .value
          )
        }
      />

      <Button
        disabled={
          !month ||
          amount <= 0 ||
          !description.trim()
        }
        onClick={() => {
          if (!month) {
            return;
          }

          addBonus(
            month,
            amount,
            description.trim()
          );

          setDescription("");

          setAmount(
            50000
          );
        }}
      >
        Add Bonus
      </Button>
    </Stack>
  );
}