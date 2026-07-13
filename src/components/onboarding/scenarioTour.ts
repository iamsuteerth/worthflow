import type { DriveStep } from "driver.js";

import { runTour } from "@/components/onboarding/driveTour";
import { useUiStore } from "@/store/uiStore";

type Section = "expenses" | "cashEvents" | "investments" | "fd" | "rd" | "events";

// The tour walks every tab of the Scenario Lab. Each tab renders under the same
// `data-tour="sl-tab"` anchor (only one section is mounted at a time), so the tour switches
// the active section as it advances rather than filtering steps. Non-tab targets
// (sl-sections, sl-saved, sl-active, sl-actions) are always present while the Lab is open.
const STEPS: DriveStep[] = [
  {
    popover: {
      title: "Scenario Lab",
      description:
        "Test changes on top of your saved plan. Nothing here touches the plan until you rebuild it in the Builder, and Reset clears it whenever you like.",
    },
  },
  {
    element: '[data-tour="sl-sections"]',
    popover: {
      title: "Six tabs",
      description: "Each tab groups one kind of change. Here is what every tab covers.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "Expenses",
      description: "One off expenses, recurring bills, credit card payments, and a spending override for a date range.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "Cash",
      description: "Salary changes, one off bonuses, and an opening cash adjustment.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "Investments",
      description: "A new investment account, contribution and return overrides, and one off deposits or withdrawals.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "FD",
      description: "A fixed deposit set by its amount, interest rate, and term.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "RD",
      description: "A recurring deposit funded every month over a fixed term.",
    },
  },
  {
    element: '[data-tour="sl-tab"]',
    popover: {
      title: "Events",
      description: "Every change you have added, grouped by type and ready to edit or remove.",
    },
  },
  {
    element: '[data-tour="sl-saved"]',
    popover: {
      title: "Saved scenarios",
      description: "Save the current changes under a name, then switch between saved scenarios to compare them.",
    },
  },
  {
    element: '[data-tour="sl-active"]',
    popover: {
      title: "Active instruments",
      description: "The fixed and recurring deposits in this scenario, with principal, interest, and maturity value.",
    },
  },
  {
    element: '[data-tour="sl-actions"]',
    popover: {
      title: "Import, export, reset",
      description: "Export a snapshot to back up or move your plan, import one to restore it, or reset to your baseline.",
    },
  },
  {
    popover: {
      title: "Make it permanent",
      description: "To keep a scenario for good, rebuild it as your base plan in the Builder.",
    },
  },
];

// The section each step needs active (null = leave the section as it is).
const SECTION_BY_STEP: (Section | null)[] = [
  null, // 0  intro
  null, // 1  tabs overview
  "expenses", // 2
  "cashEvents", // 3
  "investments", // 4
  "fd", // 5
  "rd", // 6
  "events", // 7
  null, // 8  saved
  null, // 9  active instruments
  null, // 10 import / export / reset
  null, // 11 outro
];

// Set the section for a target step; returns true if it actually changed (so the caller waits
// for the re-render before moving).
function applySection(index: number): boolean {
  const section = SECTION_BY_STEP[index];
  if (section && useUiStore.getState().scenarioSection !== section) {
    useUiStore.getState().setScenarioSection(section);
    return true;
  }
  return false;
}

function run(): void {
  runTour(STEPS, {
    onNextClick: (_element, _step, { driver }) => {
      const next = (driver.getActiveIndex() ?? 0) + 1;
      if (applySection(next)) {
        window.setTimeout(() => driver.moveNext(), 150);
      } else {
        driver.moveNext();
      }
    },
    onPrevClick: (_element, _step, { driver }) => {
      const prev = (driver.getActiveIndex() ?? 0) - 1;
      if (applySection(prev)) {
        window.setTimeout(() => driver.movePrevious(), 150);
      } else {
        driver.movePrevious();
      }
    },
  });
}

export function startScenarioTour(): void {
  // The Lab is lazy-loaded and opens with an animation, so poll until it is on screen rather
  // than guessing a single delay. This keeps the tour reliable on slow or flaky connections.
  let attempts = 0;
  const tick = () => {
    if (document.querySelector('[data-tour="sl-sections"]')) {
      run();
      return;
    }
    if (attempts++ < 30) window.setTimeout(tick, 200); // up to ~6s
  };
  tick();
}
