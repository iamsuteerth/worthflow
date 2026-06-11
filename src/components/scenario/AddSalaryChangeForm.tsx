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

export default function AddSalaryChangeForm() {
  const addSalaryChange =
    usePlannerStore(
      (state) =>
        state.addTransientSalaryChange
    );

  const [
    month,
    setMonth,
  ] = useState<
    MonthKey | null
  >("2028-01");

  const [
    newSalary,
    setNewSalary,
  ] = useState(
    150000
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
        label="New Monthly Salary"
        value={newSalary}
        min={1}
        thousandSeparator=","
        onChange={(value) =>
          setNewSalary(
            Number(value)
          )
        }
      />

      <TextInput
        label="Description"
        placeholder="Promotion"
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
          newSalary <= 0 ||
          !description.trim()
        }
        onClick={() => {
          if (!month) {
            return;
          }

          addSalaryChange(
            month,
            newSalary,
            description.trim()
          );

          setDescription("");
        }}
      >
        Add Salary Change
      </Button>
    </Stack>
  );
}