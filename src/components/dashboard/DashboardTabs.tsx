import {
  Card,
  Tabs,
} from "@mantine/core";

import ForecastTable
  from "../tables/ForecastTable";

import CashflowTable
  from "../tables/CashflowTable";

import EventTimeline
  from "../timeline/EventTimeline";

import NetWorthTable
  from "../tables/NetworthTable";

import InstrumentsTable
  from "../tables/InstrumentsTable";
import OneOffExpensesTable from "../tables/OneOffExpenses";

import classes from "./DashboardTabs.module.css";

export default function DashboardTabs() {
  return (
    <Card
      mt="lg"
      radius="xl"
      withBorder
      p="lg"
    >
      <Tabs
        defaultValue="forecast"      >
        <Tabs.List
          className={classes.tabsList}
          style={{
            overflowY: "hidden",
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Tabs.Tab
            value="forecast"
            style={{
              flexShrink: 0,
            }}
          >
            Forecast
          </Tabs.Tab>

          <Tabs.Tab value="cashflow">
            Cashflow
          </Tabs.Tab>

          <Tabs.Tab value="networth">
            Net Worth
          </Tabs.Tab>

          <Tabs.Tab value="instruments">
            Instruments
          </Tabs.Tab>

          <Tabs.Tab value="expenses">
            One-Offs
          </Tabs.Tab>

          <Tabs.Tab value="timeline">
            Timeline
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel
          value="forecast"
          pt="lg"
        >
          <ForecastTable />
        </Tabs.Panel>

        <Tabs.Panel
          value="cashflow"
          pt="lg"
        >
          <CashflowTable />
        </Tabs.Panel>

        <Tabs.Panel
          value="networth"
          pt="lg"
        >
          <NetWorthTable />
        </Tabs.Panel>

        <Tabs.Panel
          value="instruments"
          pt="lg"
        >
          <InstrumentsTable />
        </Tabs.Panel>

        <Tabs.Panel
          value="expenses"
          pt="lg"
        >
          <OneOffExpensesTable />
        </Tabs.Panel>

        <Tabs.Panel
          value="timeline"
          pt="lg"
        >
          <EventTimeline />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}