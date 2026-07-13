import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/onboarding/tour.css";

import { usePrefsStore } from "@/store/prefsStore";

// A spotlight walkthrough of the Forecast page. Framework-agnostic (driver.js), targets are
// `data-tour="…"` attributes on the forecast components. Some targets are conditional
// (the scenario banner only renders for a scenario), so steps are filtered to what's actually
// on the page before the tour runs.
const STEPS: DriveStep[] = [
  {
    element: '[data-tour="summary"]',
    popover: {
      title: "Your headline numbers",
      description: "Net worth, the lowest your cash gets, and where you land — all at a glance.",
    },
  },
  {
    element: '[data-tour="networth"]',
    popover: {
      title: "Net worth over time",
      description: "How your wealth is projected to grow across the whole forecast window.",
    },
  },
  {
    element: '[data-tour="tabs"]',
    popover: {
      title: "Dig into the detail",
      description: "Cashflow, instruments, accounts, expenses and a full month-by-month timeline — tab through them.",
    },
  },
  {
    element: '[data-tour="scenario"]',
    popover: {
      title: "Base vs scenario",
      description: "When you try what-ifs, this banner shows how they compare with your base plan.",
    },
  },
  {
    element: '[data-tour="scenario-lab"]',
    popover: {
      title: "The Scenario Lab",
      description: "Open this to model what-ifs — a salary change, a new expense — without touching your saved plan.",
    },
  },
];

export function startForecastTour(): void {
  const steps = STEPS.filter((step) => {
    const selector = typeof step.element === "string" ? step.element : null;
    return !selector || document.querySelector(selector) !== null;
  });
  if (steps.length === 0) return;

  const tour = driver({
    showProgress: true,
    popoverClass: "wf-tour", // themed to Mantine (see tour.css)
    stageRadius: 8, // rounded highlight to match the app's rounded cards
    stagePadding: 8,
    steps,
    // Ends on finish or on close (× / overlay / Esc) — either way, don't auto-run again.
    onDestroyed: () => usePrefsStore.getState().markForecastTourSeen(),
  });
  tour.drive();
}
