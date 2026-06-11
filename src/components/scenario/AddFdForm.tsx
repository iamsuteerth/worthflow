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
import InstrumentPreview from "./InstrumentPreview";
import { addMonths } from "../../engine/dateUtils";
import { formatMonth } from "../../engine/monthFormatting";
import { money } from "./moneyFormat";

export default function AddFdForm() {
  const addFd =
    usePlannerStore(
      (state) =>
        state.addTransientFd
    );

  const [
    month,
    setMonth,
  ] = useState<
    MonthKey | null
  >("2028-01");

  const [
    name,
    setName,
  ] = useState("");

  const [
    principal,
    setPrincipal,
  ] = useState(
    100000
  );

  const [
    rate,
    setRate,
  ] = useState(
    7.2
  );

  const [
    durationMonths,
    setDurationMonths,
  ] = useState(
    12
  );

  const maturityValue =
    principal *
    Math.pow(
      1 +
      rate / 100,
      durationMonths / 12
    );

  const interest =
    maturityValue -
    principal;

  const maturityMonth =
    month
      ? addMonths(
        month,
        durationMonths
      )
      : null;

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

      <TextInput
        label="FD Name"
        placeholder="SBI FD"
        value={name}
        onChange={(e) =>
          setName(
            e.currentTarget.value
          )
        }
      />

      <NumberInput
        label="Principal"
        value={principal}
        min={1}
        thousandSeparator=","
        onChange={(value) =>
          setPrincipal(
            Number(value)
          )
        }
      />

      <NumberInput
        label="Interest Rate (%)"
        value={rate}
        min={0}
        max={15}
        decimalScale={2}
        clampBehavior="strict"
        onChange={(value) =>
          setRate(
            Number(value)
          )
        }
      />

      <NumberInput
        label="Duration (Months)"
        value={durationMonths}
        min={1}
        max={120}
        clampBehavior="strict"
        onChange={(value) =>
          setDurationMonths(
            Number(value)
          )
        }
      />

      <InstrumentPreview
        title="Fixed Deposit Forecast"
        subtitle={`₹${principal.toLocaleString()} @ ${rate}%`}
        maturityValue={money(
          maturityValue
        )}

        interest={money(
          interest
        )}
        maturityMonth={formatMonth(
          maturityMonth!
        )}
        principal={money(principal)}
        type="FD"
      />

      <Button
        disabled={
          !month ||
          !name.trim() ||
          principal <= 0 ||
          rate <= 0 ||
          durationMonths <= 0
        }
        onClick={() => {
          if (!month) {
            return;
          }

          addFd(
            month,
            principal,
            rate,
            durationMonths,
            name.trim()
          );

          setName("");

          setPrincipal(
            100000
          );

          setRate(
            7.2
          );

          setDurationMonths(
            12
          );
        }}
      >
        Add FD
      </Button>
    </Stack>
  );
}