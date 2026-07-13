/* eslint-disable react-refresh/only-export-components -- colocated draft types + validation with these small field-groups */
import type { MonthKey } from "@/types/simulation";
import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";

import { Grid, NumberInput, Stack, TextInput } from "@mantine/core";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";

// FD/RD inputs + constraints, shared by the inline Add cards and the Edit modal. FD and RD
// only differ by their amount field, so they're two small concrete components (no unions).
export type FdDraft = Omit<FixedDeposit, "id">;
export type RdDraft = Omit<RecurringDeposit, "id">;

export const emptyFdDraft = (startMonth: MonthKey): FdDraft => ({
  type: "FD",
  name: "",
  principal: 0,
  rate: 0,
  startMonth,
  durationMonths: 12,
});

export const emptyRdDraft = (startMonth: MonthKey): RdDraft => ({
  type: "RD",
  name: "",
  monthlyContribution: 0,
  rate: 0,
  startMonth,
  durationMonths: 12,
});

export const fdDraftValid = (d: FdDraft): boolean =>
  d.name.trim().length > 0 && d.principal > 0 && d.rate > 0 && d.durationMonths > 0;

export const rdDraftValid = (d: RdDraft): boolean =>
  d.name.trim().length > 0 && d.monthlyContribution > 0 && d.rate > 0 && d.durationMonths > 0;

// Rate + Duration + Start Month — identical for both instruments.
function RateDurationStart<T extends { rate: number; durationMonths: number; startMonth: MonthKey }>({
  value,
  onChange,
  maxMonth,
}: {
  value: T;
  onChange: (patch: Partial<T>) => void;
  maxMonth: MonthKey;
}) {
  return (
    <>
      <Grid gap="sm">
        <Grid.Col span={6}>
          <NumberInput
            label="Interest Rate"
            value={value.rate}
            min={0}
            max={15}
            decimalScale={2}
            suffix="%"
            clampBehavior="strict"
            onChange={(v) => onChange({ rate: Number(v) } as Partial<T>)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Duration"
            value={value.durationMonths}
            min={1}
            max={120}
            suffix=" mo"
            clampBehavior="strict"
            onChange={(v) => onChange({ durationMonths: Number(v) } as Partial<T>)}
          />
        </Grid.Col>
      </Grid>
      <BuilderMonthSelect
        label="Start Month"
        value={value.startMonth}
        maxMonth={maxMonth}
        onChange={(v) => v && onChange({ startMonth: v as MonthKey } as Partial<T>)}
      />
    </>
  );
}

export function FdFields({
  value,
  onChange,
  maxMonth,
}: {
  value: FdDraft;
  onChange: (patch: Partial<FdDraft>) => void;
  maxMonth: MonthKey;
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Name"
        placeholder="e.g. SBI FD"
        value={value.name}
        onChange={(e) => onChange({ name: e.currentTarget.value })}
      />
      <NumberInput
        label="Principal"
        value={value.principal}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => onChange({ principal: Number(v) })}
      />
      <RateDurationStart value={value} onChange={onChange} maxMonth={maxMonth} />
    </Stack>
  );
}

export function RdFields({
  value,
  onChange,
  maxMonth,
}: {
  value: RdDraft;
  onChange: (patch: Partial<RdDraft>) => void;
  maxMonth: MonthKey;
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Name"
        placeholder="e.g. Post Office RD"
        value={value.name}
        onChange={(e) => onChange({ name: e.currentTarget.value })}
      />
      <NumberInput
        label="Monthly Contribution"
        value={value.monthlyContribution}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => onChange({ monthlyContribution: Number(v) })}
      />
      <RateDurationStart value={value} onChange={onChange} maxMonth={maxMonth} />
    </Stack>
  );
}
