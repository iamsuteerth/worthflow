/* eslint-disable react-refresh/only-export-components -- colocated draft types + validation with these small field-groups */
import type { MonthKey } from "@/types/simulation";

import { Alert, NumberInput, SegmentedControl, Stack, TextInput } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";
import { getMaxAnnualYears, deriveAnnualEndMonth } from "@/engine/annualExpense";

// ── Month + text + amount (one-off expense, credit-card bill, bonus, salary change) ──
// These four events all reduce to a single dated month, a text label and an amount; only the
// labels and whether the amount may be zero differ.
export interface MonthTextAmountDraft {
  month: MonthKey;
  text: string;
  amount: number;
}

export function monthTextAmountValid(d: MonthTextAmountDraft, allowZeroAmount: boolean): boolean {
  return d.text.trim().length > 0 && (allowZeroAmount ? d.amount >= 0 : d.amount > 0);
}

export function MonthTextAmountFields({
  value,
  onChange,
  minMonth,
  maxMonth,
  monthLabel,
  textLabel,
  textPlaceholder,
  amountLabel,
  allowZeroAmount = false,
}: {
  value: MonthTextAmountDraft;
  onChange: (patch: Partial<MonthTextAmountDraft>) => void;
  minMonth: MonthKey;
  maxMonth: MonthKey;
  monthLabel: string;
  textLabel: string;
  textPlaceholder: string;
  amountLabel: string;
  allowZeroAmount?: boolean;
}) {
  return (
    <Stack gap="sm">
      <BuilderMonthSelect
        value={value.month}
        minMonth={minMonth}
        maxMonth={maxMonth}
        label={monthLabel}
        onChange={(v) => v && onChange({ month: v as MonthKey })}
      />
      <TextInput
        maxLength={50}
        label={textLabel}
        placeholder={textPlaceholder}
        value={value.text}
        onChange={(e) => onChange({ text: e.currentTarget.value })}
      />
      <NumberInput
        label={amountLabel}
        value={value.amount}
        min={allowZeroAmount ? 0 : 1}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => onChange({ amount: Number(v) })}
      />
    </Stack>
  );
}

// ── Recurring expense (monthly range or annual anniversary charges) ──
export interface RecurringDraft {
  name: string;
  amount: number;
  startMonth: MonthKey;
  endMonth: MonthKey;
  years: number; // "How many times?" for ANNUAL; ignored for MONTHLY
  frequency: "MONTHLY" | "ANNUAL";
}

export function emptyRecurringDraft(startMonth: MonthKey): RecurringDraft {
  return { name: "", amount: 0, startMonth, endMonth: startMonth, years: 1, frequency: "MONTHLY" };
}

// Recover the ANNUAL "How many times?" (charge count) from a stored range for editing.
export function annualYearsFromRange(start: MonthKey, end: MonthKey): number {
  const [ay, am] = start.split("-").map(Number);
  const [by, bm] = end.split("-").map(Number);
  return Math.max(1, Math.floor(((by - ay) * 12 + (bm - am)) / 12) + 1);
}

export function recurringDraftValid(d: RecurringDraft, forecastStart: MonthKey, totalMonths: number): boolean {
  if (d.name.trim().length === 0 || d.amount <= 0) return false;
  if (d.frequency === "ANNUAL") {
    const maxYears = getMaxAnnualYears(forecastStart, totalMonths, d.startMonth);
    return d.years >= 1 && d.years <= maxYears;
  }
  return d.startMonth <= d.endMonth;
}

// Resolve a draft into the stored { endMonth } shape (ANNUAL end = last charge).
export function resolveRecurring(d: RecurringDraft): {
  name: string;
  amount: number;
  startMonth: MonthKey;
  endMonth: MonthKey;
  frequency: "MONTHLY" | "ANNUAL";
} {
  return {
    name: d.name.trim(),
    amount: d.amount,
    startMonth: d.startMonth,
    endMonth: d.frequency === "ANNUAL" ? deriveAnnualEndMonth(d.startMonth, d.years) : d.endMonth,
    frequency: d.frequency,
  };
}

export function RecurringFields({
  value,
  onChange,
  forecastStart,
  forecastEnd,
  totalMonths,
}: {
  value: RecurringDraft;
  onChange: (patch: Partial<RecurringDraft>) => void;
  forecastStart: MonthKey;
  forecastEnd: MonthKey;
  totalMonths: number;
}) {
  const maxYears = getMaxAnnualYears(forecastStart, totalMonths, value.startMonth);

  return (
    <Stack gap="sm">
      <TextInput
        maxLength={50}
        label="Name"
        placeholder="e.g. Netflix, Rent, EMI"
        value={value.name}
        onChange={(e) => onChange({ name: e.currentTarget.value })}
      />
      <NumberInput
        label={value.frequency === "ANNUAL" ? "Annual Amount" : "Monthly Amount"}
        value={value.amount}
        min={1}
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => onChange({ amount: Number(v) })}
      />
      <SegmentedControl
        value={value.frequency}
        onChange={(v) => onChange({ frequency: v as "MONTHLY" | "ANNUAL" })}
        data={[
          { label: "Monthly", value: "MONTHLY" },
          { label: "Annual", value: "ANNUAL" },
        ]}
      />
      <BuilderMonthSelect
        value={value.startMonth}
        minMonth={forecastStart}
        maxMonth={forecastEnd}
        label="Start Month"
        onChange={(v) => v && onChange({ startMonth: v as MonthKey })}
      />
      {value.frequency === "ANNUAL" ? (
        <NumberInput
          label="How many times?"
          description="Charged once a year on this month's anniversary"
          value={value.years}
          min={1}
          max={Math.max(maxYears, 1)}
          onChange={(v) => onChange({ years: Number(v) })}
        />
      ) : (
        <BuilderMonthSelect
          value={value.endMonth}
          minMonth={value.startMonth}
          maxMonth={forecastEnd}
          label="End Month"
          onChange={(v) => v && onChange({ endMonth: v as MonthKey })}
        />
      )}
      {value.frequency === "ANNUAL" && value.years > maxYears && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
          That's more times than fit the forecast — the most from this month is {maxYears}.
        </Alert>
      )}
    </Stack>
  );
}
