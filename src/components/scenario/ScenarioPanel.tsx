// src/components/scenario/ScenarioPanel.tsx
import {
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBuildingBank,
  IconDownload,
  IconList,
  IconReceipt,
  IconRefresh,
  IconTrendingUp,
  IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import { notifications } from "@mantine/notifications";
import { exportPlan } from "@/engine/exportPlan";
import { importPlan } from "@/engine/importPlan";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";

import ActiveInstruments             from "@/components/scenario/ActiveInstruments";
import AddBonusForm                  from "@/components/scenario/AddBonusForm";
import AddCreditCardExpenseForm      from "@/components/scenario/AddCreditCardExpenseForm";
import AddExpenseForm                from "@/components/scenario/AddExpenseForm";
import AddFdForm                     from "@/components/scenario/AddFdForm";
import AddAmountOverrideForm         from "@/components/scenario/AddAmountOverrideForm";
import AddInvestmentAccountForm      from "@/components/scenario/AddInvestmentAccountForm";
import AddInvestmentDepositForm      from "@/components/scenario/AddInvestmentDepositForm";
import AddInvestmentReturnOverrideForm from "@/components/scenario/AddInvestmentReturnOverrideForm";
import AddInvestmentWithdrawalForm   from "@/components/scenario/AddInvestmentWithdrawalForm";
import AddRdForm                     from "@/components/scenario/AddRdForm";
import AddRecurringExpenseForm       from "@/components/scenario/AddRecurringExpenseForm";
import AddSalaryChangeForm           from "@/components/scenario/AddSalaryChangeForm";
import RuntimeEventList              from "@/components/scenario/RuntimeEventList";
import InvestmentEventGroups         from "@/components/scenario/InvestmentEventGroups";
import SavedScenarios                from "@/components/scenario/SavedScenarios";
import type { RuntimeEvent } from "@/types/runtimeEvent";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseSub   = "expense" | "recurring" | "card" | "bonus" | "salary";
type InvestmentSub = "account" | "amountOverride" | "returnOverride" | "deposit" | "withdraw";
type InstrumentSub = "fd" | "rd";

// ─── Event categories (Events tab) ─────────────────────────────────────────────

const EVENT_CATEGORIES: { label: string; types: RuntimeEvent["type"][] }[] = [
  { label: "Income",      types: ["SALARY_CHANGE", "BONUS_INCOME"] },
  { label: "Expenses",    types: ["ONE_OFF_EXPENSE", "RECURRING_EXPENSE", "CREDIT_CARD_EXPENSE"] },
  { label: "Investments", types: ["ACCOUNT_AMOUNT_OVERRIDE", "ACCOUNT_RETURN_OVERRIDE", "INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL"] },
  { label: "FD",          types: ["FD"] },
  { label: "RD",          types: ["RD"] },
];

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 999,
        fontSize: 13,
        border: active ? "1px solid #185FA5" : "0.5px solid var(--mantine-color-default-border)",
        background: active ? "#E6F1FB" : "transparent",
        color: active ? "#185FA5" : "var(--mantine-color-dimmed)",
        fontWeight: active ? 500 : 400,
        transition: "all 120ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </UnstyledButton>
  );
}

// ─── Section button ───────────────────────────────────────────────────────────

function SectionButton({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "10px 8px",
        borderRadius: "var(--mantine-radius-md)",
        border: active
          ? "0.5px solid var(--mantine-color-default-border)"
          : "0.5px solid transparent",
        background: active ? "var(--mantine-color-body)" : "transparent",
        color: active ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
        transition: "all 120ms ease",
      }}
    >
      <Icon size={18} style={{ color: active ? "#185FA5" : "inherit" }} stroke={1.8} />
      <Text size="xs" fw={active ? 500 : 400} style={{ color: "inherit" }}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

// ─── Form panel wrapper ───────────────────────────────────────────────────────

function FormBox({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-lg)",
        padding: "1rem 1.25rem",
      }}
    >
      {children}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScenarioPanel() {
  const baseConfig     = usePlannerStore((s) => s.baseConfig);
  const overrides      = usePlannerStore((s) => s.overrides);
  const savedScenarios = usePlannerStore((s) => s.savedScenarios);
  const reset          = usePlannerStore((s) => s.resetOverrides);
  const loadPlan       = usePlannerStore((s) => s.loadPlan);

  const section          = useUiStore((s) => s.scenarioSection);
  const setSection       = useUiStore((s) => s.setScenarioSection);
  const eventsFilterTypes      = useUiStore((s) => s.eventsFilterTypes);
  const eventsFilterAccountId  = useUiStore((s) => s.eventsFilterAccountId);
  const navigateToEvents       = useUiStore((s) => s.navigateToEvents);

  const [expenseSub, setExpenseSub]     = useState<ExpenseSub>("expense");
  const [investmentSub, setInvestmentSub] = useState<InvestmentSub>("account");
  const [instrumentSub, setInstrumentSub] = useState<InstrumentSub>("fd");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      const plan = await importPlan(file);
      loadPlan(plan.baseConfig, plan.overrides, plan.savedScenarios);
      notifications.show({ color: "green", title: "Plan imported", message: "Scenario restored successfully" });
    } catch {
      notifications.show({ color: "red", title: "Import failed", message: "Invalid plan file" });
    }
  };

  return (
    <Stack gap="lg">

      {/* ── Section switcher ── */}
      <Box style={{
        display: "flex", gap: 2, padding: 4,
        borderRadius: "var(--mantine-radius-lg)",
        background: "var(--mantine-color-default-hover)",
      }}>
        <SectionButton icon={IconReceipt}     label="Expenses"    active={section === "expenses"}    onClick={() => setSection("expenses")} />
        <SectionButton icon={IconTrendingUp}  label="Investments" active={section === "investments"} onClick={() => setSection("investments")} />
        <SectionButton icon={IconBuildingBank} label="Instruments" active={section === "instruments"} onClick={() => setSection("instruments")} />
        <SectionButton icon={IconList}        label="Events"      active={section === "events"}      onClick={() => setSection("events")} />
      </Box>

      {/* ── Expenses ── */}
      {section === "expenses" && (
        <Stack gap="md">
          <Group gap={6} wrap="wrap">
            <Chip label="Expense"       active={expenseSub === "expense"}   onClick={() => setExpenseSub("expense")} />
            <Chip label="Recurring"     active={expenseSub === "recurring"} onClick={() => setExpenseSub("recurring")} />
            <Chip label="Credit card"   active={expenseSub === "card"}      onClick={() => setExpenseSub("card")} />
            <Chip label="Bonus"         active={expenseSub === "bonus"}     onClick={() => setExpenseSub("bonus")} />
            <Chip label="Salary change" active={expenseSub === "salary"}    onClick={() => setExpenseSub("salary")} />
          </Group>
          <FormBox>
            {expenseSub === "expense"   && <AddExpenseForm />}
            {expenseSub === "recurring" && <AddRecurringExpenseForm />}
            {expenseSub === "card"      && <AddCreditCardExpenseForm />}
            {expenseSub === "bonus"     && <AddBonusForm />}
            {expenseSub === "salary"    && <AddSalaryChangeForm />}
          </FormBox>
        </Stack>
      )}

      {/* ── Investments ── */}
      {section === "investments" && (
        <Stack gap="md">
          <Group gap={6} wrap="wrap">
            <Chip label="New Account"     active={investmentSub === "account"}        onClick={() => setInvestmentSub("account")} />
            <Chip label="Amount Override" active={investmentSub === "amountOverride"} onClick={() => setInvestmentSub("amountOverride")} />
            <Chip label="Return Override" active={investmentSub === "returnOverride"} onClick={() => setInvestmentSub("returnOverride")} />
            <Chip label="Deposit"         active={investmentSub === "deposit"}        onClick={() => setInvestmentSub("deposit")} />
            <Chip label="Withdraw"        active={investmentSub === "withdraw"}       onClick={() => setInvestmentSub("withdraw")} />
          </Group>
          <FormBox>
            {investmentSub === "account"        && <AddInvestmentAccountForm />}
            {investmentSub === "amountOverride" && <AddAmountOverrideForm />}
            {investmentSub === "returnOverride" && <AddInvestmentReturnOverrideForm />}
            {investmentSub === "deposit"         && <AddInvestmentDepositForm />}
            {investmentSub === "withdraw"        && <AddInvestmentWithdrawalForm />}
          </FormBox>
        </Stack>
      )}

      {/* ── Instruments ── */}
      {section === "instruments" && (
        <Stack gap="md">
          <Group gap={6}>
            <Chip label="Fixed deposit"     active={instrumentSub === "fd"} onClick={() => setInstrumentSub("fd")} />
            <Chip label="Recurring deposit" active={instrumentSub === "rd"} onClick={() => setInstrumentSub("rd")} />
          </Group>
          <FormBox>
            {instrumentSub === "fd" && <AddFdForm />}
            {instrumentSub === "rd" && <AddRdForm />}
          </FormBox>
        </Stack>
      )}

      {/* ── Events list ── */}
      {section === "events" && (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
            <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
              All active scenario modifications. Edit or delete individual events.
            </Text>
            {(eventsFilterTypes || eventsFilterAccountId) && (
              <Button variant="subtle" size="xs" onClick={() => navigateToEvents()} style={{ flexShrink: 0 }}>
                Show all
              </Button>
            )}
          </Group>
          {EVENT_CATEGORIES.map(({ label, types }) => {
            const effectiveTypes = eventsFilterTypes
              ? types.filter((t) => eventsFilterTypes.includes(t))
              : types;
            if (effectiveTypes.length === 0) return null;

            const hasEvents = (overrides.runtimeEvents ?? []).some((e) => effectiveTypes.includes(e.type));
            if (!hasEvents) return null;

            return (
              <Stack key={label} gap="xs">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  {label}
                </Text>
                {label === "Investments" ? (
                  <InvestmentEventGroups
                    defaultAccountId={eventsFilterAccountId}
                    typeFilter={effectiveTypes.length < types.length ? effectiveTypes : null}
                  />
                ) : (
                  <RuntimeEventList filterTypes={effectiveTypes} />
                )}
              </Stack>
            );
          })}
        </Stack>
      )}

      {/* ── Import / Export / Reset ── */}
      <Divider />
      <Text size="xs" c="dimmed">
        Import or export complete planner snapshots.
      </Text>
      <input
        ref={fileInputRef}
        type="file"
        accept=".wfplan"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await handleImport(file);
          e.target.value = "";
        }}
      />
      <Group grow gap={8}>
        <Button variant="default" leftSection={<IconUpload size={14} />} onClick={() => fileInputRef.current?.click()}>
          Import
        </Button>
        <Button variant="default" leftSection={<IconDownload size={14} />} onClick={() => exportPlan({ baseConfig, overrides, savedScenarios })}>
          Export
        </Button>
        <Button color="red" variant="light" leftSection={<IconRefresh size={14} />} onClick={reset}>
          Reset
        </Button>
      </Group>

      <Divider />
      <SavedScenarios />

      <Divider />
      <ActiveInstruments />

      <Divider />
    </Stack>
  );
}