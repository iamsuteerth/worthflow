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
} from "react";

import {
  usePlannerStore,
} from "../../store/plannerStore";

export default function SavedScenarios() {
  const scenarios =
    usePlannerStore(
      (state) =>
        state.savedScenarios
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
                    <Text
                      fw={500}
                      size="sm"
                    >
                      {
                        scenario.name
                      }
                    </Text>

                    <Badge
                      size="xs"
                      variant="light"
                    >
                      {(scenario
                        .overrides
                        .runtimeEvents
                        ?.length ??
                        0)}
                      {" "}
                      changes
                    </Badge>
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