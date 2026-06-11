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
import { formatMonth } from "../../engine/monthFormatting";
import { addMonths } from "../../engine/dateUtils";
import { money } from "./moneyFormat";

export default function AddRdForm() {
  const addRd =
    usePlannerStore(
      (state) =>
        state.addTransientRd
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
    monthlyContribution,
    setMonthlyContribution,
  ] = useState(
    10000
  );

  const [
    rate,
    setRate,
  ] = useState(
    6.8
  );

  const [
    durationMonths,
    setDurationMonths,
  ] = useState(
    24
  );

  const totalContribution =
    monthlyContribution *
    durationMonths;

  const maturityValue =
    totalContribution *
    Math.pow(
      1 +
      rate / 100,
      durationMonths / 12
    );

  const interest =
    maturityValue -
    totalContribution;

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
        label="RD Name"
        placeholder="SBI RD"
        value={name}
        onChange={(e) =>
          setName(
            e.currentTarget.value
          )
        }
      />

      <NumberInput
        label="Monthly Contribution"
        value={
          monthlyContribution
        }
        min={1}
        thousandSeparator=","
        onChange={(value) =>
          setMonthlyContribution(
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
        title="Recurring Deposit Forecast"
        subtitle={`${money(monthlyContribution)}/month`}
        maturityValue={money(
          maturityValue
        )}
        interest={money(
          interest
        )}
        maturityMonth={formatMonth(
          maturityMonth!
        )}
        principal={money(
          monthlyContribution *
          durationMonths
        )}
        type="RD"
      />

      <Button
        disabled={
          !month ||
          !name.trim() ||
          monthlyContribution <= 0 ||
          rate <= 0 ||
          durationMonths <= 0
        }
        onClick={() => {
          if (!month) {
            return;
          }

          addRd(
            month,
            monthlyContribution,
            rate,
            durationMonths,
            name.trim()
          );

          setName("");

          setMonthlyContribution(
            10000
          );

          setRate(
            6.8
          );

          setDurationMonths(
            24
          );
        }}
      >
        Add RD
      </Button>
    </Stack>
  );
}