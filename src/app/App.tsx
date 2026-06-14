// src/app/App.tsx
import {
  useEffect,
} from "react";

import {
  Tabs,
} from "@mantine/core";

import {
  IconChartLine,
  IconSettings,
} from "@tabler/icons-react";

import PlannerShell
  from "@/components/layout/AppShell";

import LoginPage
  from "@/components/auth/LoginPage";

import ForecastPage
  from "@/pages/ForecastPage";

import ConfigBuilderPage
  from "@/pages/ConfigBuilderPage";

import {
  usePlannerStore,
  type AppView,
} from "@/store/plannerStore";

import {
  useAuthStore,
} from "@/store/authStore";

export default function App() {
  const activeView =
    usePlannerStore(
      (state) =>
        state.activeView
    );

  const setActiveView =
    usePlannerStore(
      (state) =>
        state.setActiveView
    );

  const authenticated =
    useAuthStore(
      (state) =>
        state.authenticated
    );

  const restore =
    useAuthStore(
      (state) =>
        state.restore
    );

  useEffect(() => {
    restore();

    const interval =
      setInterval(
        restore,
        60_000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [restore]);

  if (
    !authenticated
  ) {
    return (
      <LoginPage />
    );
  }

  return (
    <PlannerShell>
      <Tabs
        value={activeView}
        onChange={(value) =>
          setActiveView(
            value as AppView
          )
        }
        mb="lg"
      >
        <Tabs.List>
          <Tabs.Tab
            value="builder"
            leftSection={
              <IconSettings
                size={14}
              />
            }
          >
            Build Plan
          </Tabs.Tab>

          <Tabs.Tab
            value="forecast"
            leftSection={
              <IconChartLine
                size={14}
              />
            }
          >
            Forecast
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeView ===
      "builder" ? (
        <ConfigBuilderPage />
      ) : (
        <ForecastPage />
      )}
    </PlannerShell>
  );
}