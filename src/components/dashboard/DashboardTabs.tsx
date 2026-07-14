import { Card, Tabs } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import classes from "@/components/dashboard/DashboardTabs.module.css";
import CashflowTable from "@/components/tables/CashflowTable";
import ForecastTable from "@/components/tables/ForecastTable";
import InstrumentsTable from "@/components/tables/InstrumentsTable";
import InvestmentAccountsTable from "@/components/tables/InvestmentAccountsTable";
import NetWorthTable from "@/components/tables/NetworthTable";
import OneOffExpensesTable from "@/components/tables/OneOffExpenses";
import EventTimeline from "@/components/timeline/EventTimeline";
import InvestmentTimeline from "@/components/timeline/InvestmentTimeline";
import { useUiStore, type DashboardTabValue } from "@/store/uiStore";

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

  const stripRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const syncOverflow = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    syncOverflow();
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(syncOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncOverflow]);

  return (
    <Card data-tour="tabs" mt="lg" radius="lg" withBorder p={0} style={{ overflow: "hidden" }}>
      <Tabs
        value={dashboardTab}
        onChange={(value) =>
          value && setDashboardTab(value as DashboardTabValue)
        }
        variant="none"
      >
        <div
          className={classes.stripWrap}
          data-can-left={overflow.left || undefined}
          data-can-right={overflow.right || undefined}
        >
          <div ref={stripRef} className={classes.strip} onScroll={syncOverflow}>
            {TABS.map(({ value, label }) => (
              <Tabs.Tab key={value} value={value} className={classes.tab}>
                {label}
              </Tabs.Tab>
            ))}
          </div>
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
