/* eslint-disable react-refresh/only-export-components -- colocated draft type + validation with this small field-group */
import type { MonthKey } from "@/types/simulation";
import type { InvestmentAccount } from "@/types/investmentAccount";

import { Grid, NumberInput, TextInput } from "@mantine/core";
import BuilderMonthSelect from "@/components/builder/BuilderMonthSelect";

// One source of truth for the investment-account inputs + their constraints, shared by the
// inline Add card and the Edit modal.
export type AccountDraft = Omit<InvestmentAccount, "id">;

export function emptyAccountDraft(startMonth: MonthKey): AccountDraft {
  return {
    name: "",
    startMonth,
    openingBalance: 0,
    defaultMonthlyContribution: 0,
    defaultAnnualReturn: 0,
  };
}

export function accountDraftValid(d: AccountDraft): boolean {
  return d.name.trim().length > 0 && (d.openingBalance > 0 || d.defaultMonthlyContribution > 0);
}

interface Props {
  value: AccountDraft;
  onChange: (patch: Partial<AccountDraft>) => void;
  minMonth: MonthKey;
  maxMonth: MonthKey;
}

export default function AccountFields({ value, onChange, minMonth, maxMonth }: Props) {
  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label="Account Name"
          placeholder="e.g. Nifty 50, Emergency Fund"
          value={value.name}
          onChange={(event) => onChange({ name: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <BuilderMonthSelect
          value={value.startMonth}
          label="Start Month"
          minMonth={minMonth}
          maxMonth={maxMonth}
          onChange={(v) => v && onChange({ startMonth: v as MonthKey })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <NumberInput
          label="Opening Balance"
          value={value.openingBalance}
          min={0}
          thousandSeparator=","
          prefix="₹"
          onChange={(v) => onChange({ openingBalance: Number(v) })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <NumberInput
          label="Default Monthly Contribution"
          value={value.defaultMonthlyContribution}
          min={0}
          thousandSeparator=","
          prefix="₹"
          onChange={(v) => onChange({ defaultMonthlyContribution: Number(v) })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <NumberInput
          label="Default Annual Return"
          value={value.defaultAnnualReturn}
          min={-99.99}
          max={1000}
          decimalScale={2}
          suffix="%"
          onChange={(v) => onChange({ defaultAnnualReturn: Number(v) })}
        />
      </Grid.Col>
    </Grid>
  );
}
