// src/store/uiStore.ts
import { create } from "zustand";
import type { RuntimeEvent } from "@/types/runtimeEvent";

export type DashboardTabValue =
  | "forecast"
  | "cashflow"
  | "networth"
  | "instruments"
  | "expenses"
  | "timeline"
  | "investments"
  | "accounts";

export type ScenarioSection = "expenses" | "investments" | "instruments" | "events";

interface UiStore {
  dashboardTab: DashboardTabValue;
  setDashboardTab: (tab: DashboardTabValue) => void;

  highlightAccountId: string | null;
  setHighlightAccountId: (id: string | null) => void;

  // ── Scenario Lab routing (RD-4) ───────────────────────────────────────────
  scenarioSection: ScenarioSection;
  setScenarioSection: (section: ScenarioSection) => void;

  eventsFilterTypes: RuntimeEvent["type"][] | null;
  eventsFilterAccountId: string | null;

  scenarioDrawerOpened: boolean;
  openScenarioDrawer: () => void;
  closeScenarioDrawer: () => void;

  // Routes the Scenario Lab to the Events section, optionally pre-scoped to a
  // set of event types and/or an investment account (Banner navigation, RD-4).
  navigateToEvents: (filter?: { types?: RuntimeEvent["type"][]; accountId?: string }) => void;
}

// Transient, non-persisted UI state for cross-component navigation/highlighting.
export const useUiStore = create<UiStore>()((set) => ({
  dashboardTab: "forecast",
  setDashboardTab: (tab) => set({ dashboardTab: tab }),

  highlightAccountId: null,
  setHighlightAccountId: (id) => set({ highlightAccountId: id }),

  scenarioSection: "expenses",
  setScenarioSection: (section) => set({ scenarioSection: section }),

  eventsFilterTypes: null,
  eventsFilterAccountId: null,

  scenarioDrawerOpened: false,
  openScenarioDrawer: () => set({ scenarioDrawerOpened: true }),
  closeScenarioDrawer: () => set({ scenarioDrawerOpened: false }),

  navigateToEvents: (filter) =>
    set({
      scenarioSection: "events",
      eventsFilterTypes: filter?.types ?? null,
      eventsFilterAccountId: filter?.accountId ?? null,
      scenarioDrawerOpened: true,
    }),
}));
