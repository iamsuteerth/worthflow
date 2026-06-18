import { useEffect } from "react";
import { Group, SegmentedControl } from "@mantine/core";
import { IconChartLine, IconSettings } from "@tabler/icons-react";

import PlannerShell from "@/components/layout/AppShell";
import LoginPage from "@/components/auth/LoginPage";
import ForecastPage from "@/pages/ForecastPage";
import ConfigBuilderPage from "@/pages/ConfigBuilderPage";

import { usePlannerStore, type AppView } from "@/store/plannerStore";
import { useAuthStore } from "@/store/authStore";

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
  const restore = useAuthStore((state) => state.restore);

  useEffect(() => {
    restore();
    const interval = setInterval(restore, 60_000);
    return () => clearInterval(interval);
  }, [restore]);

  if (!authenticated) {
    return <LoginPage />;
  }

  return (
    <PlannerShell>
      <SegmentedControl
        value={activeView}
        onChange={(value) => setActiveView(value as AppView)}
        data={NAV_DATA}
        mb="lg"
        radius="md"
      />

      {activeView === "builder" ? <ConfigBuilderPage /> : <ForecastPage />}
    </PlannerShell>
  );
}
