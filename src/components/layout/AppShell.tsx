import {
  AppShell,
  Avatar,
  Burger,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";

import ThemeToggle from "@/components/layout/ThemeToggle";
import { useIsMobile } from "@/hooks/useIsMobile";
import ScenarioPanel from "@/components/scenario/ScenarioPanel";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { UserProfileModal } from "@/components/profile/UserProfileModal";

interface Props {
  children: ReactNode;
}

function getInitials(email: string): string {
  return (email.split("@")[0]?.[0] ?? "?").toUpperCase();
}

export default function PlannerShell({ children }: Props) {
  const opened = useUiStore((state) => state.scenarioDrawerOpened);
  const open = useUiStore((state) => state.openScenarioDrawer);
  const close = useUiStore((state) => state.closeScenarioDrawer);
  const activeView = usePlannerStore((state) => state.activeView);
  const user = useAuthStore((state) => state.user);
  const isMobile = useIsMobile();

  const [profileOpened, { open: openProfile, close: closeProfile }] = useDisclosure(false);

  const initials = user ? getInitials(user.email) : "?";

  return (
    <>
      {activeView === "forecast" && (
        <Drawer
          opened={isMobile && opened}
          onClose={close}
          title={
            <Stack gap={2}>
              <Text fw={700} size="sm">
                Scenario Lab
              </Text>
              <Text size="xs" c="dimmed">
                Explore financial what-if scenarios.
              </Text>
            </Stack>
          }
          styles={{ body: { paddingBottom: 40 } }}
          size="100%"
          hiddenFrom="sm"
          position="left"
        >
          <ScenarioPanel />
        </Drawer>
      )}

      <UserProfileModal opened={profileOpened} onClose={closeProfile} />

      <AppShell
        header={{ height: 60 }}
        navbar={
          activeView === "forecast"
            ? {
                width: { sm: 400, lg: 440 },
                breakpoint: "sm",
                collapsed: { mobile: true },
              }
            : undefined
        }
        padding="lg"
      >
        <AppShell.Header>
          <Group justify="space-between" h="100%" px="md">
            <Group>
              {activeView === "forecast" && (
                <Burger
                  hiddenFrom="sm"
                  opened={opened}
                  onClick={opened ? close : open}
                  size="sm"
                />
              )}
              <Title order={4} fw={700}>
                Worth Flow
              </Title>
            </Group>

            <Group gap="xs">
              <ThemeToggle />
              <UnstyledButton onClick={openProfile} aria-label="Profile">
                <Avatar radius="xl" size="sm" color="brand" style={{ cursor: "pointer" }}>
                  {initials}
                </Avatar>
              </UnstyledButton>
            </Group>
          </Group>
        </AppShell.Header>

        {activeView === "forecast" && (
          <AppShell.Navbar
            visibleFrom="sm"
            p="md"
            style={{ overflowY: "auto", overflowX: "hidden" }}
          >
            <Stack gap={2} mb="md">
              <Text fw={700} size="sm">
                Scenario Lab
              </Text>
              <Text size="xs" c="dimmed">
                Explore financial what-if scenarios.
              </Text>
            </Stack>
            <ScenarioPanel />
          </AppShell.Navbar>
        )}

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
