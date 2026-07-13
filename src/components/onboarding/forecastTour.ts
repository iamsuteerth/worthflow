import type { DriveStep } from "driver.js";

import { runTour } from "@/components/onboarding/driveTour";
import { usePrefsStore } from "@/store/prefsStore";

// Targets are `data-tour="…"` attributes on the forecast components. Some are conditional
// (the scenario banner only renders for a scenario), so steps are filtered to what is on the
// page before the tour runs.
const STEPS: DriveStep[] = [
  {
    element: '[data-tour="summary"]',
    popover: {
      title: "Headline numbers",
      description: "Net worth, the lowest your cash reaches, and your closing balance for this plan.",
    },
  },
  {
    element: '[data-tour="networth"]',
    popover: {
      title: "Net worth over time",
      description: "Projected net worth for every month in the forecast window.",
    },
  },
  {
    element: '[data-tour="tabs"]',
    popover: {
      title: "Detailed views",
      description: "Cashflow, instruments, accounts, expenses, and a month by month timeline.",
    },
  },
  {
    element: '[data-tour="scenario"]',
    popover: {
      title: "Scenario banner",
      description: "Shows when you are viewing a scenario, with the difference from your base plan.",
    },
  },
  {
    element: '[data-tour="scenario-lab"]',
    popover: {
      title: "Scenario Lab",
      description: "Open it to test changes without altering your saved plan.",
    },
  },
];

export function startForecastTour(): void {
  const steps = STEPS.filter((step) => {
    const selector = typeof step.element === "string" ? step.element : null;
    return !selector || document.querySelector(selector) !== null;
  });
  if (steps.length === 0) return;

  runTour(steps, { onDestroyed: () => usePrefsStore.getState().markForecastTourSeen() });
}
