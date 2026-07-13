import SummaryCards from "@/components/SummaryCards";
import NetWorthChart from "@/components/charts/NetWorthChart";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ScenarioBanner from "@/components/scenario/ScenarioBanner";

// The forecast tour is not started here: it would fire for existing users the moment they
// load a saved plan. Instead it greets a brand-new user right after they generate their first
// plan (see ReviewStep.handleGenerate), and can be replayed from the Tutorials menu.
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
