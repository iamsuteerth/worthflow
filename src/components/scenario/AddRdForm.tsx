import { Button, Grid, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { addMonths } from "../../engine/dateUtils";
import { formatMonth } from "../../engine/monthFormatting";
import { usePlannerStore } from "../../store/plannerStore";
import type { MonthKey } from "../../types/simulation";
import MonthSelect from "../common/MonthSelect";
import InstrumentPreview from "./InstrumentPreview";
import { money } from "./moneyFormat";

export default function AddRdForm() {
  const addRd = usePlannerStore((state) => state.addTransientRd);

  const [month, setMonth] = useState<MonthKey | null>("2028-01");
  const [name, setName] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState(10000);
  const [rate, setRate] = useState(6.8);
  const [durationMonths, setDurationMonths] = useState(24);

  const totalContribution = monthlyContribution * durationMonths;
  const maturityValue = totalContribution * Math.pow(1 + rate / 100, durationMonths / 12);
  const interest = maturityValue - totalContribution;
  const maturityMonth = month ? addMonths(month, durationMonths) : null;

  return (
    <Stack gap="sm">
      <MonthSelect
        value={month}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <TextInput
        maxLength={50}
        label="RD Name"
        placeholder="e.g. Post Office RD"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <NumberInput
        label="Monthly Contribution"
        value={monthlyContribution}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setMonthlyContribution(Number(value))}
      />

      <Grid gap="sm">
        <Grid.Col span={6}>
          <NumberInput
            label="Interest Rate"
            value={rate}
            min={0}
            max={15}
            decimalScale={2}
            suffix="%"
            clampBehavior="strict"
            onChange={(value) => setRate(Number(value))}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Duration"
            value={durationMonths}
            min={1}
            max={120}
            suffix=" mo"
            clampBehavior="strict"
            onChange={(value) => setDurationMonths(Number(value))}
          />
        </Grid.Col>
      </Grid>

      {monthlyContribution > 0 && rate > 0 && maturityMonth && (
        <InstrumentPreview
          title="Recurring Deposit Forecast"
          subtitle={`${money(monthlyContribution)}/month`}
          maturityValue={money(maturityValue)}
          interest={money(interest)}
          maturityMonth={formatMonth(maturityMonth)}
          principal={money(monthlyContribution * durationMonths)}
          type="RD"
        />
      )}

      <Button
        leftSection={<IconRefresh size={16} />}
        color="violet"
        disabled={!month || !name.trim() || monthlyContribution <= 0 || rate <= 0 || durationMonths <= 0}
        onClick={() => {
          if (!month) return;
          addRd(month, monthlyContribution, rate, durationMonths, name.trim());
          setName("");
          setMonthlyContribution(10000);
          setRate(6.8);
          setDurationMonths(24);
        }}
      >
        Add RD
      </Button>
    </Stack>
  );
}