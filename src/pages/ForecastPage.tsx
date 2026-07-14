import { useEffect } from "react";

import NetWorthChart from "@/components/charts/NetWorthChart";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import { runRequestedForecastTour } from "@/components/onboarding/forecastTour";
import ScenarioBanner from "@/components/scenario/ScenarioBanner";
import SummaryCards from "@/components/SummaryCards";

export default function ForecastPage() {
  // Runs the forecast tour only if one was requested when a new user generated their first
  // plan (see ReviewStep). This fires the moment the lazy forecast page mounts, so it is
  // robust to how long the chunk took to load. For an existing user loading a saved plan no
  // request is pending, so nothing happens.
  useEffect(() => {
    runRequestedForecastTour();
  }, []);

  return (
    <>
      <SummaryCards />
      <ScenarioBanner />
      <NetWorthChart />
      <DashboardTabs />
    </>
  );
}
