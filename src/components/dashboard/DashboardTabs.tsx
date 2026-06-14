// src/components/dashboard/DashboardTabs.tsx
import { Card, Tabs } from "@mantine/core";

import ForecastTable       from "@/components/tables/ForecastTable";
import CashflowTable       from "@/components/tables/CashflowTable";
import EventTimeline       from "@/components/timeline/EventTimeline";
import NetWorthTable       from "@/components/tables/NetworthTable";
import InstrumentsTable    from "@/components/tables/InstrumentsTable";
import OneOffExpensesTable from "@/components/tables/OneOffExpenses";
import InvestmentTimeline from "@/components/timeline/InvestmentTimeline";

import classes from "@/components/dashboard/DashboardTabs.module.css";

// ─── Tab manifest ─────────────────────────────────────────────────────────────

const TABS = [
  { value: "forecast",    label: "Forecast"    },
  { value: "cashflow",    label: "Cashflow"    },
  { value: "networth",    label: "Net Worth"   },
  { value: "instruments", label: "Instruments" },
  { value: "expenses",    label: "One-Offs"    },
  { value: "timeline",    label: "Timeline"    },
  { value: "investments", label: "Investments" },
] as const;

type TabValue = typeof TABS[number]["value"];

const PANELS: Record<TabValue, React.ReactNode> = {
  forecast:    <ForecastTable />,
  cashflow:    <CashflowTable />,
  networth:    <NetWorthTable />,
  instruments: <InstrumentsTable />,
  expenses:    <OneOffExpensesTable />,
  timeline:    <EventTimeline />,
  investments: <InvestmentTimeline />
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardTabs() {
  return (
    <Card mt="lg" radius="xl" withBorder p={0} style={{ overflow: "hidden" }}>
      <Tabs defaultValue="forecast" variant="none">

        {/* Scrollable tab strip */}
        <div className={classes.strip}>
          {TABS.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} className={classes.tab}>
              {label}
            </Tabs.Tab>
          ))}
        </div>

        {/* Panels */}
        {(Object.entries(PANELS) as [TabValue, React.ReactNode][]).map(([value, content]) => (
          <Tabs.Panel key={value} value={value} p="lg">
            {content}
          </Tabs.Panel>
        ))}

      </Tabs>
    </Card>
  );
}