import {
  ActionIcon,
  AppShell,
  Burger,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import {
  useDisclosure,
} from "@mantine/hooks";

import type {
  ReactNode,
} from "react";

import ThemeToggle
  from "./ThemeToggle";

import ScenarioPanel
  from "../scenario/ScenarioPanel";

import {
  usePlannerStore,
} from "../../store/plannerStore";

import {
  IconLogout,
} from "@tabler/icons-react";
import { useAuthStore } from "../../store/authStore";

interface Props {
  children: ReactNode;
}

export default function PlannerShell({
  children,
}: Props) {
  const [
    opened,
    { open, close },
  ] = useDisclosure(
    false
  );

  const activeView =
    usePlannerStore(
      (state) =>
        state.activeView
    );

  const logout =
    useAuthStore(
      (state) =>
        state.logout
    );

  return (
    <>
      {activeView ===
        "forecast" && (
          <Drawer
            opened={opened}
            onClose={close}
            scrollAreaComponent={ScrollArea.Autosize}
            title={
              <div>
                <Text fw={700}>
                  Scenario Lab
                </Text>

                <Text
                  size="sm"
                  c="dimmed"
                >
                  Explore financial
                  what-if scenarios.
                </Text>
              </div>
            }
            styles={{
              body: {
                paddingBottom: 40,
              },
            }}
            size="100%"
            hiddenFrom="sm"
            position="left"
          >
            <ScenarioPanel />
          </Drawer>
        )}

      <AppShell
        header={{
          height: 70,
        }}
        navbar={
          activeView === "forecast"
            ? {
              width: 340,
              breakpoint: "sm",
              collapsed: {
                mobile: true,
              },
            }
            : undefined
        }
        padding="lg"
      >
        <AppShell.Header>
          <Group
            justify="space-between"
            h="100%"
            px="md"
          >
            <Group>
              {activeView ===
                "forecast" && (
                  <Burger
                    hiddenFrom="sm"
                    opened={opened}
                    onClick={
                      opened
                        ? close
                        : open
                    }
                    size="sm"
                  />
                )}

              <Stack gap={0}>
                <Title
                  order={4}
                  fw={700}
                >
                  Finance Planner
                </Title>

                <Text
                  size="xs"
                  c="dimmed"
                >
                  Personal Wealth
                  Forecast
                </Text>
              </Stack>
            </Group>

            <Group gap="xs">
              <ThemeToggle />

              <ActionIcon
                variant="light"
                onClick={logout}
              >
                <IconLogout
                  size={18}
                />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>

        {activeView ===
          "forecast" && (
            <AppShell.Navbar
              visibleFrom="sm"
              p="lg"
              style={{
                overflowY:
                  "auto",
                overflowX:
                  "hidden",
              }}
            >
              <div>
                <Text fw={500}>
                  Scenario Lab
                </Text>

                <Text
                  size="sm"
                  c="dimmed"
                >
                  Explore financial
                  what-if scenarios.
                </Text>
              </div>
              <ScenarioPanel />
            </AppShell.Navbar>
          )}

        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
    </>
  );
}