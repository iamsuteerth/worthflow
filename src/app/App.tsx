import { useEffect, useState, lazy, Suspense } from "react";
import { Alert, Button, Center, Group, Loader, SegmentedControl, Stack } from "@mantine/core";
import { IconChartLine, IconCloudOff, IconSettings } from "@tabler/icons-react";

import PlannerShell from "@/components/layout/AppShell";
import LoginPage from "@/components/auth/LoginPage";

import { AI_ENABLED } from "@/lib/featureFlags";
import { usePlannerStore, type AppView } from "@/store/plannerStore";
import { useAuthStore } from "@/store/authStore";
import { useCloudStore } from "@/store/cloudStore";

let aiStoreImport: Promise<{ useAiStore: { getState: () => { initAi: () => Promise<void> } } }> | null = null;
if (AI_ENABLED) {
  aiStoreImport = import("@/store/aiStore") as unknown as typeof aiStoreImport;
}

const ForecastPage = lazy(() => import("@/pages/ForecastPage"));
const ConfigBuilderPage = lazy(() => import("@/pages/ConfigBuilderPage"));

const NAV_DATA = [
  {
    value: "builder",
    label: (
      <Group gap={6} wrap="nowrap">
        <IconSettings size={14} />
        <span>Build Plan</span>
      </Group>
    ),
  },
  {
    value: "forecast",
    label: (
      <Group gap={6} wrap="nowrap">
        <IconChartLine size={14} />
        <span>Forecast</span>
      </Group>
    ),
  },
];

export default function App() {
  const activeView = usePlannerStore((state) => state.activeView);
  const setActiveView = usePlannerStore((state) => state.setActiveView);
  const authenticated = useAuthStore((state) => state.authenticated);
  const loading = useAuthStore((state) => state.loading);
  const hydrate = useAuthStore((state) => state.hydrate);
  const autoLoadLatest = useCloudStore((state) => state.autoLoadLatest);
  const initialLoadFailed = useCloudStore((state) => state.initialLoadFailed);
  const [cloudReady, setCloudReady] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    autoLoadLatest().finally(async () => {
      if (!cancelled) {
        setCloudReady(true);
        if (aiStoreImport) {
          aiStoreImport.then(({ useAiStore }) => {
            useAiStore.getState().initAi().catch(() => { });
          });
        }
      }
    });
    return () => {
      cancelled = true;
      setCloudReady(false);
    };
  }, [authenticated, autoLoadLatest]);

  if (loading || (authenticated && !cloudReady)) {
    return (
      <Center h="100vh">
        <Loader color="brand" />
      </Center>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  async function handleRetry() {
    setRetrying(true);
    await autoLoadLatest();
    setRetrying(false);
  }

  return (
    <PlannerShell>
      <Stack gap="md">
        {initialLoadFailed && (
          <Alert
            color="orange"
            variant="light"
            icon={<IconCloudOff size={16} />}
            title="Cloud sync failed"
            radius="md"
          >
            <Group gap="sm" align="center">
              Could not reach your cloud saves. Your previous plan may not be loaded.
              <Button size="xs" variant="light" color="orange" onClick={handleRetry} loading={retrying}>
                Retry
              </Button>
            </Group>
          </Alert>
        )}
        <SegmentedControl
          value={activeView}
          onChange={(value) => setActiveView(value as AppView)}
          data={NAV_DATA}
          radius="md"
        />
        <Suspense fallback={<Loader />}>
          {activeView === "builder"
            ? <ConfigBuilderPage />
            : <ForecastPage />}
        </Suspense>
      </Stack>
    </PlannerShell>
  );
}
