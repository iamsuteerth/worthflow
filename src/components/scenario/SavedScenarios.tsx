import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import {
  useDisclosure,
} from "@mantine/hooks";

import {
  IconDeviceFloppy,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import {
  useState,
  useMemo,
} from "react";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import { simulate }
  from "../../engine/simulate";

import { buildEffectiveConfig }
  from "../../engine/buildEffectiveConfig";

export default function SavedScenarios() {
  const scenarios =
    usePlannerStore(
      (state) =>
        state.savedScenarios
    );

  const baseConfig =
    usePlannerStore(
      (state) =>
        state.baseConfig
    );

  const saveScenario =
    usePlannerStore(
      (state) =>
        state.saveScenario
    );

  const loadScenario =
    usePlannerStore(
      (state) =>
        state.loadScenario
    );

  const deleteScenario =
    usePlannerStore(
      (state) =>
        state.deleteScenario
    );

  const [
    opened,
    { open, close },
  ] = useDisclosure(
    false
  );

  const [
    scenarioName,
    setScenarioName,
  ] = useState("");

  const handleSave =
    () => {
      const trimmed =
        scenarioName.trim();

      if (!trimmed) {
        return;
      }

      saveScenario(
        trimmed
      );

      setScenarioName(
        ""
      );

      close();
    };

  function formatDelta(
    value: number
  ) {
    const sign =
      value >= 0
        ? "+"
        : "-";

    return (
      sign +
      "₹" +
      Math.abs(
        Math.round(value)
      ).toLocaleString()
    );
  }

  function deltaColor(
    value: number
  ) {
    if (value > 0) {
      return "green";
    }

    if (value < 0) {
      return "red";
    }

    return "gray";
  }

  const scenarioComparisons =
    useMemo(() => {
      const baseResult =
        simulate(
          baseConfig
        );

      return Object.fromEntries(
        scenarios.map(
          (scenario) => {
            const scenarioResult =
              simulate(
                buildEffectiveConfig(
                  baseConfig,
                  scenario.overrides
                )
              );

            return [
              scenario.id,
              {
                netWorth:
                  scenarioResult.summary.finalNetWorth -
                  baseResult.summary.finalNetWorth,

                cash:
                  scenarioResult.summary.finalBalance -
                  baseResult.summary.finalBalance,

                lowestCash:
                  scenarioResult.summary.lowestBalance -
                  baseResult.summary.lowestBalance,
              },
            ];
          }
        )
      );
    }, [
      scenarios,
      baseConfig,
    ]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => {
          setScenarioName(
            ""
          );

          close();
        }}
        title="Save Scenario"
        centered
      >
        <Stack>
          <TextInput
            label="Scenario Name"
            placeholder="Promotion Plan"
            value={
              scenarioName
            }
            onChange={(
              event
            ) =>
              setScenarioName(
                event
                  .currentTarget
                  .value
              )
            }
          />

          <Group
            justify="flex-end"
          >
            <Button
              variant="default"
              onClick={() => {
                setScenarioName(
                  ""
                );

                close();
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={
                handleSave
              }
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="xs">
        <Group
          justify="space-between"
        >
          <Text fw={600}>
            Saved Scenarios
          </Text>

          <Button
            size="xs"
            leftSection={
              <IconDeviceFloppy
                size={14}
              />
            }
            onClick={
              open
            }
          >
            Save
          </Button>
        </Group>

        {scenarios.length ===
          0 ? (
          <Paper
            withBorder
            radius="md"
            p="sm"
          >
            <Text
              size="sm"
              c="dimmed"
            >
              No saved scenarios
            </Text>
          </Paper>
        ) : (
          scenarios.map(
            (
              scenario
            ) => (
              <Paper
                key={
                  scenario.id
                }
                withBorder
                radius="md"
                p="sm"
              >
                <Group
                  justify="space-between"
                  align="center"
                >
                  <Stack
                    gap={2}
                  >
                    <Group gap="xs">
                      <Text fw={600}>
                        {scenario.name}
                      </Text>

                      <Badge
                        size="sm"
                        variant="light"
                      >
                        {(scenario.overrides.runtimeEvents?.length ?? 0)}
                        {" "}
                        changes
                      </Badge>
                    </Group>
                    {(() => {
                      const comparison =
                        scenarioComparisons[
                        scenario.id
                        ];

                      if (
                        !comparison
                      ) {
                        return null;
                      }

                      return (
                        <Group
                          justify="start"
                          mt="xs"
                        >
                          <Stack gap={0}>
                            <Text size="xs" c="dimmed">
                              Net Worth
                            </Text>

                            <Text
                              fw={500}
                              c={deltaColor(comparison.netWorth)}
                            >
                              {formatDelta(comparison.netWorth)}
                            </Text>
                          </Stack>

                          <Stack gap={0}>
                            <Text size="xs" c="dimmed">
                              Cash
                            </Text>

                            <Text
                              fw={500}
                              c={deltaColor(comparison.cash)}
                            >
                              {formatDelta(comparison.cash)}
                            </Text>
                          </Stack>

                          <Stack gap={0}>
                            <Text size="xs" c="dimmed">
                              Lowest Cash
                            </Text>

                            <Text
                              fw={500}
                              c={deltaColor(comparison.lowestCash)}
                            >
                              {formatDelta(comparison.lowestCash)}
                            </Text>
                          </Stack>
                        </Group>
                      );
                    })()}
                  </Stack>

                  <Group
                    gap={4}
                  >
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() =>
                        loadScenario(
                          scenario.id
                        )
                      }
                    >
                      <IconUpload
                        size={14}
                      />
                    </ActionIcon>

                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() =>
                        deleteScenario(
                          scenario.id
                        )
                      }
                    >
                      <IconTrash
                        size={14}
                      />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            )
          )
        )}
      </Stack>
    </>
  );
}