import {
  Button,
  Divider,
  Group,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import AddExpenseForm
  from "./AddExpenseForm";

import AddCreditCardExpenseForm
  from "./AddCreditCardExpenseForm";

import AddBonusForm
  from "./AddBonusForm";

import AddSalaryChangeForm
  from "./AddSalaryChangeForm";

import AddFdForm
  from "./AddFdForm";

import AddRdForm
  from "./AddRdForm";

import ActiveInstruments
  from "./ActiveInstruments";

import SavedScenarios
  from "./SavedScenarios";

import {
  notifications,
} from "@mantine/notifications";

import { exportPlan } from "../../engine/exportPlan";
import { useRef } from "react";
import { importPlan } from "../../engine/importPlan";

import classes from "./ScenarioPanel.module.css";
import AddInvestmentOverrideForm from "./AddInvestmentOverrideForm";

export default function ScenarioPanel() {
  const baseConfig =
    usePlannerStore(
      (state) =>
        state.baseConfig
    );

  const overrides =
    usePlannerStore(
      (state) =>
        state.overrides
    );

  const reset =
    usePlannerStore(
      (state) =>
        state.resetOverrides
    );

  const loadPlan =
    usePlannerStore(
      (state) =>
        state.loadPlan
    );

  const fileInputRef =
    useRef<
      HTMLInputElement
    >(null);

  const savedScenarios =
    usePlannerStore(
      (state) =>
        state.savedScenarios
    );

  const handleImport =
    async (
      file: File
    ) => {
      try {
        const plan =
          await importPlan(
            file
          );

        loadPlan(
          plan.baseConfig,
          plan.overrides,
          plan.savedScenarios
        );

        notifications.show({
          color: "green",

          title:
            "Plan Imported",

          message:
            "Scenario restored successfully",
        });
      } catch {
        notifications.show({
          color: "red",

          title:
            "Import Failed",

          message:
            "Invalid plan file",
        });
      }
    };

  return (
    <Stack gap="lg" >
      <Tabs
        defaultValue="expense"
      >
        <Tabs.List
          className={classes.tabsList}
        >
          <Tabs.Tab
            value="expense"
            style={{
              flexShrink: 0,
            }}
          >
            Expense
          </Tabs.Tab>

          <Tabs.Tab value="investment">
            Investment
          </Tabs.Tab>

          <Tabs.Tab value="card">
            Card
          </Tabs.Tab>

          <Tabs.Tab value="bonus">
            Bonus
          </Tabs.Tab>

          <Tabs.Tab value="salary">
            Salary
          </Tabs.Tab>

          <Tabs.Tab value="fd">
            FD
          </Tabs.Tab>

          <Tabs.Tab value="rd">
            RD
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel
          value="expense"
          pt="lg"
        >
          <AddExpenseForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="investment"
          pt="lg"
        >
          <AddInvestmentOverrideForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="card"
          pt="lg"
        >
          <AddCreditCardExpenseForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="bonus"
          pt="lg"
        >
          <AddBonusForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="salary"
          pt="lg"
        >
          <AddSalaryChangeForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="fd"
          pt="lg"
        >
          <AddFdForm />
        </Tabs.Panel>

        <Tabs.Panel
          value="rd"
          pt="lg"
        >
          <AddRdForm />
        </Tabs.Panel>
      </Tabs>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        hidden
        onChange={async (
          event
        ) => {
          const file =
            event.target
              .files?.[0];

          if (!file) {
            return;
          }

          await handleImport(
            file
          );

          event.target.value =
            "";
        }}
      />
      <Text
        size="xs"
        c="dimmed"
      >
        Import or export complete planner snapshots, including configuration and scenario changes.
      </Text>
      <Group grow>
        <Button
          variant="default"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Import
        </Button>

        <Button
          variant="default"
          onClick={() =>
            exportPlan({
              baseConfig,
              overrides,
              savedScenarios,
            })
          }
        >
          Export
        </Button>

        <Button
          color="red"
          variant="light"
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