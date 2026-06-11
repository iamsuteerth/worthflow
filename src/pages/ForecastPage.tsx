
import SummaryCards
  from "../components/SummaryCards";

import NetWorthChart
  from "../components/charts/NetWorthChart";

import DashboardTabs
  from "../components/dashboard/DashboardTabs";

import ScenarioBanner
  from "../components/scenario/ScenarioBanner";

export default function ForecastPage() {
  return (
    <>
      <SummaryCards />

      <ScenarioBanner />

      <NetWorthChart />

      <DashboardTabs />
    </>
  );
}