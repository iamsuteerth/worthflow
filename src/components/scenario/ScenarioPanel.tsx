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
  IconReceipt,
  IconRefresh,
  IconTrendingUp,
  IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import { notifications } from "@mantine/notifications";
import { exportPlan } from "../../engine/exportPlan";
import { importPlan } from "../../engine/importPlan";
import { usePlannerStore } from "../../store/plannerStore";

import ActiveInstruments from "./ActiveInstruments";
import AddBonusForm from "./AddBonusForm";
import AddCreditCardExpenseForm from "./AddCreditCardExpenseForm";
import AddExpenseForm from "./AddExpenseForm";
import AddFdForm from "./AddFdForm";
import AddInvestmentDepositForm from "./AddInvestmentDepositForm";
import AddInvestmentOverrideForm from "./AddInvestmentOverrideForm";
import AddInvestmentReturnOverrideForm from "./AddInvestmentReturnOverrideForm";
import AddInvestmentWithdrawalForm from "./AddInvestmentWithdrawalForm";
import AddRdForm from "./AddRdForm";
import AddSalaryChangeForm from "./AddSalaryChangeForm";
import SavedScenarios from "./SavedScenarios";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "expenses" | "investments" | "instruments";
type ExpenseSub = "expense" | "card" | "bonus" | "salary";
type InvestmentSub = "override" | "rate" | "deposit" | "withdraw";
type InstrumentSub = "fd" | "rd";

// ─── Sub-nav chip ─────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
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

// ─── Section nav button ───────────────────────────────────────────────────────

function SectionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
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
        border: active ? "0.5px solid var(--mantine-color-default-border)" : "0.5px solid transparent",
        background: active ? "var(--mantine-color-body)" : "transparent",
        color: active ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
        transition: "all 120ms ease",
      }}
    >
      <Icon
        size={18}
        style={{ color: active ? "#185FA5" : "inherit" }}
        stroke={1.8}
      />
      <Text size="xs" fw={active ? 500 : 400} style={{ color: "inherit" }}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScenarioPanel() {
  const baseConfig = usePlannerStore((s) => s.baseConfig);
  const overrides = usePlannerStore((s) => s.overrides);
  const reset = usePlannerStore((s) => s.resetOverrides);
  const loadPlan = usePlannerStore((s) => s.loadPlan);
  const savedScenarios = usePlannerStore((s) => s.savedScenarios);

  const [section, setSection] = useState<Section>("expenses");
  const [expenseSub, setExpenseSub] = useState<ExpenseSub>("expense");
  const [investmentSub, setInvestmentSub] = useState<InvestmentSub>("override");
  const [instrumentSub, setInstrumentSub] = useState<InstrumentSub>("fd");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      const plan = await importPlan(file);
      loadPlan(plan.baseConfig, plan.overrides, plan.savedScenarios);
      notifications.show({
        color: "green",
        title: "Plan imported",
        message: "Scenario restored successfully",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Import failed",
        message: "Invalid plan file",
      });
    }
  };

  return (
    <Stack gap="lg">

      {/* ── Section switcher ── */}
      <Box
        style={{
          display: "flex",
          gap: 2,
          padding: 4,
          borderRadius: "var(--mantine-radius-lg)",
          background: "var(--mantine-color-default-hover)",
        }}
      >
        <SectionButton
          icon={IconReceipt}
          label="Expenses"
          active={section === "expenses"}
          onClick={() => setSection("expenses")}
        />
        <SectionButton
          icon={IconTrendingUp}
          label="Investments"
          active={section === "investments"}
          onClick={() => setSection("investments")}
        />
        <SectionButton
          icon={IconBuildingBank}
          label="Instruments"
          active={section === "instruments"}
          onClick={() => setSection("instruments")}
        />
      </Box>

      {/* ── Expenses ── */}
      {section === "expenses" && (
        <Stack gap="md">
          <Group gap={6} wrap="wrap">
            <Chip label="Expense"       active={expenseSub === "expense"} onClick={() => setExpenseSub("expense")} />
            <Chip label="Credit card"   active={expenseSub === "card"}    onClick={() => setExpenseSub("card")} />
            <Chip label="Bonus"         active={expenseSub === "bonus"}   onClick={() => setExpenseSub("bonus")} />
            <Chip label="Salary change" active={expenseSub === "salary"}  onClick={() => setExpenseSub("salary")} />
          </Group>
          <Box
            style={{
              background: "var(--mantine-color-body)",
              border: "0.5px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-lg)",
              padding: "1rem 1.25rem",
            }}
          >
            {expenseSub === "expense" && <AddExpenseForm />}
            {expenseSub === "card"    && <AddCreditCardExpenseForm />}
            {expenseSub === "bonus"   && <AddBonusForm />}
            {expenseSub === "salary"  && <AddSalaryChangeForm />}
          </Box>
        </Stack>
      )}

      {/* ── Investments ── */}
      {section === "investments" && (
        <Stack gap="md">
          <Group gap={6} wrap="wrap">
            <Chip label="Override"    active={investmentSub === "override"}  onClick={() => setInvestmentSub("override")} />
            <Chip label="Return rate" active={investmentSub === "rate"}      onClick={() => setInvestmentSub("rate")} />
            <Chip label="Deposit"     active={investmentSub === "deposit"}   onClick={() => setInvestmentSub("deposit")} />
            <Chip label="Withdraw"    active={investmentSub === "withdraw"}  onClick={() => setInvestmentSub("withdraw")} />
          </Group>
          <Box
            style={{
              background: "var(--mantine-color-body)",
              border: "0.5px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-lg)",
              padding: "1rem 1.25rem",
            }}
          >
            {investmentSub === "override"  && <AddInvestmentOverrideForm />}
            {investmentSub === "rate"      && <AddInvestmentReturnOverrideForm />}
            {investmentSub === "deposit"   && <AddInvestmentDepositForm />}
            {investmentSub === "withdraw"  && <AddInvestmentWithdrawalForm />}
          </Box>
        </Stack>
      )}

      {/* ── Instruments ── */}
      {section === "instruments" && (
        <Stack gap="md">
          <Group gap={6}>
            <Chip label="Fixed deposit"     active={instrumentSub === "fd"} onClick={() => setInstrumentSub("fd")} />
            <Chip label="Recurring deposit" active={instrumentSub === "rd"} onClick={() => setInstrumentSub("rd")} />
          </Group>
          <Box
            style={{
              background: "var(--mantine-color-body)",
              border: "0.5px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-lg)",
              padding: "1rem 1.25rem",
            }}
          >
            {instrumentSub === "fd" && <AddFdForm />}
            {instrumentSub === "rd" && <AddRdForm />}
          </Box>
        </Stack>
      )}

      {/* ── Import / Export / Reset ── */}
      <Divider />

      <Text size="xs" c="dimmed">
        Import or export complete planner snapshots, including configuration and scenario changes.
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
        <Button
          variant="default"
          leftSection={<IconUpload size={14} />}
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </Button>
        <Button
          variant="default"
          leftSection={<IconDownload size={14} />}
          onClick={() => exportPlan({ baseConfig, overrides, savedScenarios })}
        >
          Export
        </Button>
        <Button
          color="red"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          onClick={reset}
        >
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