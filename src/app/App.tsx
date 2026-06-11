import PlannerShell
  from "../components/layout/AppShell";

import {
  usePlannerStore,
  type AppView,
} from "../store/plannerStore";

import ForecastPage
  from "../pages/ForecastPage";

import ConfigBuilderPage
  from "../pages/ConfigBuilderPage";

import {
  Tabs,
} from "@mantine/core";

import {
  IconChartLine,
  IconSettings,
} from "@tabler/icons-react";

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