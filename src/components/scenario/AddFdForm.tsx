import { Button, Grid, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconBuildingBank } from "@tabler/icons-react";
import { useState } from "react";
import { addMonths } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { usePlannerStore } from "@/store/plannerStore";
import type { MonthKey } from "@/types/simulation";
import MonthSelect from "@/components/common/MonthSelect";
import InstrumentPreview from "@/components/scenario/InstrumentPreview";
import { money } from "@/components/scenario/moneyFormat";

export default function AddFdForm() {
  const addFd = usePlannerStore((state) => state.addTransientFd);

  const [month, setMonth] = useState<MonthKey | null>("2028-01");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.2);
  const [durationMonths, setDurationMonths] = useState(12);

  const maturityValue = principal * Math.pow(1 + rate / 100, durationMonths / 12);
  const interest = maturityValue - principal;
  const maturityMonth = month ? addMonths(month, durationMonths) : null;

  return (
    <Stack gap="sm">
      <MonthSelect
        value={month}
        onChange={(value) => setMonth(value as MonthKey | null)}
      />

      <TextInput
        maxLength={50}
        label="FD Name"
        placeholder="e.g. SBI Fixed Deposit"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <NumberInput
        label="Principal"
        value={principal}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(value) => setPrincipal(Number(value))}
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

      {principal > 0 && rate > 0 && maturityMonth && (
        <InstrumentPreview
          title="Fixed Deposit Forecast"
          subtitle={`₹${principal.toLocaleString()} @ ${rate}%`}
          maturityValue={money(maturityValue)}
          interest={money(interest)}
          maturityMonth={formatMonth(maturityMonth)}
          principal={money(principal)}
          type="FD"
        />
      )}

      <Button
        leftSection={<IconBuildingBank size={16} />}
        color="teal"
        disabled={!month || !name.trim() || principal <= 0 || rate <= 0 || durationMonths <= 0}
        onClick={() => {
          if (!month) return;
          addFd(month, principal, rate, durationMonths, name.trim());
          setName("");
          setPrincipal(100000);
          setRate(7.2);
          setDurationMonths(12);
        }}
      >
        Add FD
      </Button>
    </Stack>
  );
}