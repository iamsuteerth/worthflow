import { useEffect, useState } from "react";
import { Button, List, Modal, Stack, Text } from "@mantine/core";
import BuilderWizard from "@/components/builder/BuilderWizard";
import { usePlannerStore } from "@/store/plannerStore";
import { useBuilderStore } from "@/store/builderStore";
import { configToBuilder } from "@/engine/configToBuilder";
import { buildEffectiveConfig } from "@/engine/buildEffectiveConfig";
import type { PlannerOverrides } from "@/types/overrides";

// Any active Scenario Lab change (override-layer or scalar) means the builder could
// either start fresh from the baseline or fold these edits in.
function hasScenarioChanges(overrides: PlannerOverrides): boolean {
  return (
    (overrides.runtimeEvents?.length ?? 0) > 0 ||
    (overrides.scenarioAccounts?.length ?? 0) > 0 ||
    (overrides.deletedAccountIds?.length ?? 0) > 0 ||
    overrides.incomeMonthly !== undefined ||
    overrides.openingBalance !== undefined ||
    overrides.forecastMonths !== undefined
  );
}

export default function ConfigBuilderPage() {
  // Decided once at mount (each entry into the builder remounts this page): offer the
  // base-vs-keep choice only for a real plan that has active scenario changes. Computed
  // in the initializer so we never call setState synchronously inside the effect.
  const [seedChoiceOpen, setSeedChoiceOpen] = useState(() => {
    const { baseConfig, overrides } = usePlannerStore.getState();
    return baseConfig.income.monthly > 0 && hasScenarioChanges(overrides);
  });

  useEffect(() => {
    const { baseConfig } = usePlannerStore.getState();
    // "Real plan" guard: fresh users have initialConfig.income.monthly === 0.
    // Default to the baseline; the modal (if shown) lets the user fold edits in instead.
    if (baseConfig.income.monthly > 0) {
      useBuilderStore.getState().setState(configToBuilder(baseConfig));
      useBuilderStore.getState().setSeedSource("base");
    }
  }, []); // runs on each entry into the builder view

  function keepEdits() {
    const { baseConfig, overrides } = usePlannerStore.getState();
    // Seed from the effective config so accounts, FDs/RDs, expenses, opening cash and
    // income changes carry into the builder draft. (configToBuilder is baseline-only, so
    // range overrides and deposits/withdrawals can't be represented — see the modal note.)
    useBuilderStore.getState().setState(configToBuilder(buildEffectiveConfig(baseConfig, overrides)));
    useBuilderStore.getState().setSeedSource("effective");
    setSeedChoiceOpen(false);
  }

  function startFromBase() {
    // The draft was already seeded from baseConfig above.
    setSeedChoiceOpen(false);
  }

  return (
    <>
      <Modal
        opened={seedChoiceOpen}
        onClose={startFromBase}
        title="Build a new plan"
        centered
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm">
            You have active Scenario Lab changes. How should the builder start?
          </Text>
          <Text size="xs" c="dimmed">
            <b>Keep my edits</b> folds your current changes into the builder so you can turn them
            into a new base plan. A few things can't carry over — the builder captures your{" "}
            <b>baseline</b> only:
          </Text>
          <List size="xs" spacing={2} c="dimmed">
            <List.Item>Investment <b>deposits</b> and <b>withdrawals</b></List.Item>
            <List.Item>Date-range overrides (spending, contribution, return)</List.Item>
          </List>
          <Text size="xs" c="dimmed">
            Generating creates a new plan you can save through the normal flow.
          </Text>
          <Stack gap="xs" mt="xs">
            <Button onClick={keepEdits}>Keep my edits</Button>
            <Button variant="default" onClick={startFromBase}>
              Start from base
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <BuilderWizard />
    </>
  );
}
