import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDeviceFloppy, IconFolderOpen, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { buildEffectiveConfig } from "../../engine/buildEffectiveConfig";
import { simulate } from "../../engine/simulate";
import { usePlannerStore } from "../../store/plannerStore";

function DeltaStat({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? "green" : value < 0 ? "red" : "gray";
  const sign = value >= 0 ? "+" : "-";
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text
        fw={600}
        size="sm"
        c={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {sign}₹{Math.abs(Math.round(value)).toLocaleString()}
      </Text>
    </div>
  );
}

export default function SavedScenarios() {
  const scenarios = usePlannerStore((state) => state.savedScenarios);
  const baseConfig = usePlannerStore((state) => state.baseConfig);
  const saveScenario = usePlannerStore((state) => state.saveScenario);
  const loadScenario = usePlannerStore((state) => state.loadScenario);
  const deleteScenario = usePlannerStore((state) => state.deleteScenario);

  const [opened, { open, close }] = useDisclosure(false);
  const [scenarioName, setScenarioName] = useState("");

  const handleSave = () => {
    const trimmed = scenarioName.trim();
    if (!trimmed) return;
    saveScenario(trimmed);
    setScenarioName("");
    close();
  };

  const scenarioComparisons = useMemo(() => {
    const baseResult = simulate(baseConfig);
    return Object.fromEntries(
      scenarios.map((scenario) => {
        const scenarioResult = simulate(
          buildEffectiveConfig(baseConfig, scenario.overrides)
        );
        return [
          scenario.id,
          {
            netWorth:
              scenarioResult.summary.finalNetWorth - baseResult.summary.finalNetWorth,
            cash:
              scenarioResult.summary.finalBalance - baseResult.summary.finalBalance,
            lowestCash:
              scenarioResult.summary.lowestBalance - baseResult.summary.lowestBalance,
          },
        ];
      })
    );
  }, [scenarios, baseConfig]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => {
          setScenarioName("");
          close();
        }}
        title="Save Scenario"
        centered
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Scenario Name"
            placeholder="e.g. Promotion Plan"
            value={scenarioName}
            onChange={(event) => setScenarioName(event.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setScenarioName("");
                close();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!scenarioName.trim()}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            Saved Scenarios
          </Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={open}
          >
            Save current
          </Button>
        </Group>

        {scenarios.length === 0 ? (
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed" ta="center">
              No saved scenarios yet.
            </Text>
          </Card>
        ) : (
          scenarios.map((scenario) => {
            const comparison = scenarioComparisons[scenario.id];
            const changeCount = scenario.overrides.runtimeEvents?.length ?? 0;

            return (
              <Card key={scenario.id} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start" mb="xs">
                  <Group gap="xs">
                    <Text fw={700} size="sm">
                      {scenario.name}
                    </Text>
                    <Badge size="sm" variant="light" color="gray">
                      {changeCount} change{changeCount !== 1 ? "s" : ""}
                    </Badge>
                  </Group>
                  <Group gap={4}>
                    <Tooltip label="Load scenario">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => loadScenario(scenario.id)}
                      >
                        <IconFolderOpen size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete scenario">
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => deleteScenario(scenario.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                {comparison && (
                  <>
                    <Divider mb="xs" />
                    <SimpleGrid cols={3} spacing="xs">
                      <DeltaStat label="Net Worth" value={comparison.netWorth} />
                      <DeltaStat label="Final Cash" value={comparison.cash} />
                      <DeltaStat label="Lowest Cash" value={comparison.lowestCash} />
                    </SimpleGrid>
                  </>
                )}
              </Card>
            );
          })
        )}
      </Stack>
    </>
  );
}