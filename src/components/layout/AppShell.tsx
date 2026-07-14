import type { ReactNode } from "react";

import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHelpCircle } from "@tabler/icons-react";
import { lazy, Suspense } from "react";

import AppFooter from "@/components/layout/AppFooter";
import { ScenarioPanelSkeleton } from "@/components/layout/SkeletonLoaders";
import ThemeToggle from "@/components/layout/ThemeToggle";
import TutorialModal from "@/components/onboarding/TutorialModal";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AI_ENABLED } from "@/lib/featureFlags";
import { useAuthStore } from "@/store/authStore";
import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { getInitials } from "@/utils/display";

const AiFab = AI_ENABLED
  ? lazy(() => import("@/components/ai/AiFab"))
  : null;

const ScenarioPanel = lazy(
  () => import("@/components/scenario/ScenarioPanel")
);

// Shared by the content column and the footer's inner content so footer items
// line up with the columns above; the footer border still spans full width.
const CONTENT_MAX_WIDTH = 1920;

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
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);

  const initials = user ? getInitials(user.email) : "?";

  return (
    <>
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
          <Suspense fallback={<ScenarioPanelSkeleton />}>
            <ScenarioPanel />
          </Suspense>
        </Drawer>
      )}

      <UserProfileModal
        opened={profileOpened}
        onClose={closeProfile}
      />

      <TutorialModal opened={helpOpened} onClose={closeHelp} />

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
                  data-tour="scenario-lab"
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
              <Tooltip label="Tutorials">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Tutorials"
                  onClick={openHelp}
                >
                  <IconHelpCircle size={20} />
                </ActionIcon>
              </Tooltip>

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

        {activeView === "forecast" && !isMobile && (
          <AppShell.Navbar
            p="md"
            style={{
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <ScenarioLabHeading />
            <Suspense fallback={<ScenarioPanelSkeleton />}>
              <ScenarioPanel />
            </Suspense>
          </AppShell.Navbar>
        )}

        {/* Main fills the grid's 1fr row (viewport height). Making it a flex
            column and letting the content grow pushes the footer to the bottom
            when content is short, while keeping it inset under the navbar. */}
        <AppShell.Main style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, width: "100%", maxWidth: CONTENT_MAX_WIDTH, marginInline: "auto" }}>
            {children}
          </div>
          <AppFooter maxWidth={CONTENT_MAX_WIDTH} />
        </AppShell.Main>
      </AppShell>

      {AiFab && (
        <Suspense fallback={null}>
          <AiFab />
        </Suspense>
      )}
    </>
  );
}
