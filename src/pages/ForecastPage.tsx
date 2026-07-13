import { useEffect } from "react";

import SummaryCards from "@/components/SummaryCards";
import NetWorthChart from "@/components/charts/NetWorthChart";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ScenarioBanner from "@/components/scenario/ScenarioBanner";
import { usePrefsStore } from "@/store/prefsStore";
import { startForecastTour } from "@/components/onboarding/forecastTour";

export default function ForecastPage() {
  const hasSeenForecastTour = usePrefsStore((s) => s.hasSeenForecastTour);

  // First visit only: run the tour once the page has painted. (Marked seen on finish/close.)
  // Replays are triggered from the Tutorials modal in the header.
  useEffect(() => {
    if (hasSeenForecastTour) return;
    const t = window.setTimeout(() => startForecastTour(), 500);
    return () => window.clearTimeout(t);
  }, [hasSeenForecastTour]);

  return (
    <>
      <SummaryCards />
      <ScenarioBanner />
      <NetWorthChart />
      <DashboardTabs />
    </>
  );
}
