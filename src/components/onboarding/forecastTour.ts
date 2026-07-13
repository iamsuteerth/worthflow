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

function stepsPresentInDom(): DriveStep[] {
  return STEPS.filter((step) => {
    const selector = typeof step.element === "string" ? step.element : null;
    return !selector || document.querySelector(selector) !== null;
  });
}

function markSeen() {
  usePrefsStore.getState().markForecastTourSeen();
}

export function startForecastTour(): void {
  const steps = stepsPresentInDom();
  if (steps.some((s) => typeof s.element === "string")) {
    runTour(steps, { onDestroyed: markSeen });
    return;
  }
  // Targets not painted yet (e.g. a slow lazy chunk) — retry once shortly.
  window.setTimeout(() => {
    const retry = stepsPresentInDom();
    if (retry.some((s) => typeof s.element === "string")) runTour(retry, { onDestroyed: markSeen });
  }, 400);
}

// One-shot request, set when a brand-new user generates their first plan and consumed when the
// (lazy-loaded) forecast page actually mounts. This makes the greeting event-driven rather than
// timer-driven, so it opens whenever the page appears — no matter how long the chunk took to
// load on a slow or flaky connection.
let pending = false;

export function requestForecastTour(): void {
  pending = true;
}

export function runRequestedForecastTour(): void {
  if (!pending) return;
  pending = false;
  // The page has just mounted; a short beat lets the view transition settle before the overlay.
  window.setTimeout(() => startForecastTour(), 400);
}
