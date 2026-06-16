import { Card } from "@mantine/core";

import SummaryCards
  from "@/components/SummaryCards";

import NetWorthChart
  from "@/components/charts/NetWorthChart";

import DashboardTabs
  from "@/components/dashboard/DashboardTabs";

import ScenarioBanner
  from "@/components/scenario/ScenarioBanner";

import MonthRangeFilter
  from "@/components/common/MonthRangeFilter";

export default function ForecastPage() {
  return (
    <>
      <SummaryCards />

      <ScenarioBanner />

      <Card withBorder radius="md" p="sm" mt="md">
        <MonthRangeFilter />
      </Card>

      <NetWorthChart />

      <DashboardTabs />
    </>
  );
}