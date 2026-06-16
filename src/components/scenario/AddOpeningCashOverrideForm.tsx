import { Alert, Button, NumberInput, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconWallet } from "@tabler/icons-react";
import { useState } from "react";
import { usePlannerStore } from "@/store/plannerStore";

export default function AddOpeningCashOverrideForm() {
  const baseConfig = usePlannerStore((s) => s.baseConfig);
  const overrides = usePlannerStore((s) => s.overrides);
  const addOpeningCashOverride = usePlannerStore((s) => s.addTransientOpeningCashOverride);

  const baseOpening = baseConfig.cash.openingBalance;
  const [amount, setAmount] = useState(baseOpening);

  const hasExisting = (overrides.runtimeEvents ?? []).some(
    (e) => e.type === "OPENING_CASH_OVERRIDE"
  );

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Replaces the opening cash balance for this scenario. Negative values are allowed. They model starting in debt or overdraft.
        Only one override is active at a time; saving a new value replaces the existing one.
      </Text>

      <NumberInput
        label="Opening Cash Balance"
        description={`Baseline opening cash: ₹${baseOpening.toLocaleString("en-IN")}`}
        value={amount}
        allowNegative
        thousandSeparator=","
        prefix="₹"
        onChange={(v) => setAmount(Number(v))}
      />

      {hasExisting && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" p="xs">
          An existing opening cash override will be replaced with this value.
        </Alert>
      )}

      <Button
        leftSection={<IconWallet size={16} />}
        color="yellow"
        onClick={() => addOpeningCashOverride(amount)}
      >
        {hasExisting ? "Update Opening Cash Override" : "Set Opening Cash Override"}
      </Button>
    </Stack>
  );
}
