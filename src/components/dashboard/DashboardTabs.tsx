import { Card, Tabs } from "@mantine/core";

import ForecastTable from "@/components/tables/ForecastTable";
import CashflowTable from "@/components/tables/CashflowTable";
import EventTimeline from "@/components/timeline/EventTimeline";
import NetWorthTable from "@/components/tables/NetworthTable";
import InstrumentsTable from "@/components/tables/InstrumentsTable";
import OneOffExpensesTable from "@/components/tables/OneOffExpenses";
import InvestmentTimeline from "@/components/timeline/InvestmentTimeline";
import InvestmentAccountsTable from "@/components/tables/InvestmentAccountsTable";
import { useUiStore, type DashboardTabValue } from "@/store/uiStore";

import classes from "@/components/dashboard/DashboardTabs.module.css";

const TABS: { value: DashboardTabValue; label: string }[] = [
  { value: "forecast", label: "Forecast" },
  { value: "cashflow", label: "Cashflow" },
  { value: "networth", label: "Net Worth" },
  { value: "instruments", label: "Instruments" },
  { value: "expenses", label: "One-Offs" },
  { value: "timeline", label: "Timeline" },
  { value: "investments", label: "Investments Timeline" },
  { value: "accounts", label: "Investment Accounts" },
];

const PANELS: Record<DashboardTabValue, React.ReactNode> = {
  forecast: <ForecastTable />,
  cashflow: <CashflowTable />,
  networth: <NetWorthTable />,
  instruments: <InstrumentsTable />,
  expenses: <OneOffExpensesTable />,
  timeline: <EventTimeline />,
  investments: <InvestmentTimeline />,
  accounts: <InvestmentAccountsTable />,
};

export default function DashboardTabs() {
  const dashboardTab = useUiStore((s) => s.dashboardTab);
  const setDashboardTab = useUiStore((s) => s.setDashboardTab);

  return (
    <Card mt="lg" radius="lg" withBorder p={0} style={{ overflow: "hidden" }}>
      <Tabs
        value={dashboardTab}
        onChange={(value) =>
          value && setDashboardTab(value as DashboardTabValue)
        }
        variant="none"
      >
        <div className={classes.strip}>
          {TABS.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} className={classes.tab}>
              {label}
            </Tabs.Tab>
          ))}
        </div>

        {(
          Object.entries(PANELS) as [DashboardTabValue, React.ReactNode][]
        ).map(([value, content]) => (
          <Tabs.Panel key={value} value={value} p="lg">
            {content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Card>
  );
}
