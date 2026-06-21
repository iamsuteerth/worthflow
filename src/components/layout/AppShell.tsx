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
import { lazy, Suspense, type ReactNode } from "react";

import ThemeToggle from "@/components/layout/ThemeToggle";
import AppFooter from "@/components/layout/AppFooter";
import { useIsMobile } from "@/hooks/useIsMobile";
import ScenarioPanel from "@/components/scenario/ScenarioPanel";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { getInitials } from "@/utils/display";

// Lazy-loaded AI components: only bundled & reachable when VITE_AI_ENABLED is true.
const AiFab = import.meta.env.VITE_AI_ENABLED
  ? lazy(() => import("@/components/ai/AiFab"))
  : null;


interface Props {
  children: ReactNode;
}

function ScenarioLabHeading() {
  return (
    <Stack gap={2} mb="md">
      <Text fw={700} size="sm">
        Scenario Lab
      </Text>
      <Text size="xs" c="dimmed">
        Explore financial what-if scenarios.
      </Text>
    </Stack>
  );
}

export default function PlannerShell({ children }: Props) {
  const opened = useUiStore((state) => state.scenarioDrawerOpened);
  const open = useUiStore((state) => state.openScenarioDrawer);
  const close = useUiStore((state) => state.closeScenarioDrawer);

  const activeView = usePlannerStore((state) => state.activeView);
  const user = useAuthStore((state) => state.user);
  const isMobile = useIsMobile();

  const [profileOpened, { open: openProfile, close: closeProfile }] =
    useDisclosure(false);

  const initials = user ? getInitials(user.email) : "?";

  return (
    <>
      {/* Mobile drawer only */}
      {activeView === "forecast" && isMobile && (
        <Drawer
          opened={opened}
          onClose={close}
          title={<ScenarioLabHeading />}
          styles={
            {
              body: { paddingBottom: 40 },
              header: {
                alignItems: "flex-start",
                paddingTop: 12,
              },
            }
          }
          size="100%"
          radius={0}
          position="left"
        >
          <ScenarioPanel />
        </Drawer>
      )}

      <UserProfileModal
        opened={profileOpened}
        onClose={closeProfile}
      />

      <AppShell
        header={{ height: 60 }}
        navbar={
          activeView === "forecast"
            ? {
                width: { sm: 400, lg: 440 },
                breakpoint: "sm",
                collapsed: {
                  mobile: true,
                  desktop: !opened,
                },
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
                  opened={opened}
                  onClick={opened ? close : open}
                  size="sm"
                  aria-label="Toggle Scenario Lab"
                />
              )}

              <Title order={4} fw={700}>
                Worth Flow
              </Title>
            </Group>

            <Group gap="xs">
              <ThemeToggle />

              <UnstyledButton
                onClick={openProfile}
                aria-label="Profile"
              >
                <Avatar
                  radius="xl"
                  size="sm"
                  color="brand"
                  style={{ cursor: "pointer" }}
                >
                  {initials}
                </Avatar>
              </UnstyledButton>
            </Group>
          </Group>
        </AppShell.Header>

        {/* Desktop sidebar only */}
        {activeView === "forecast" && !isMobile && (
          <AppShell.Navbar
            p="md"
            style={{
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <ScenarioLabHeading />
            <ScenarioPanel />
          </AppShell.Navbar>
        )}

        <AppShell.Main>
          {children}
          <AppFooter />
        </AppShell.Main>
      </AppShell>

      {/* Floating AI assistant — rendered outside AppShell so position:fixed is unaffected */}
      {AiFab && (
        <Suspense fallback={null}>
          <AiFab />
        </Suspense>
      )}
    </>
  );
}
