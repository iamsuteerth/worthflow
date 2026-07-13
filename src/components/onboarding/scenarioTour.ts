import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/onboarding/tour.css";

// A walkthrough of the Scenario Lab drawer. Targets are always-present drawer elements
// (`data-tour="sl-…"`), so the tour needs no mid-flight section switching — the caller just
// opens the Lab on a form-bearing section first (see TutorialModal). Themed via tour.css.
const STEPS: DriveStep[] = [
  {
    popover: {
      title: "The Scenario Lab",
      description:
        "Your what-if sandbox — model changes on top of your saved plan without touching it. Reset wipes them whenever you like.",
    },
  },
  {
    element: '[data-tour="sl-sections"]',
    popover: {
      title: "Pick a category",
      description:
        "Add or tweak Expenses, Cash, Investments, FD or RD — and open Events to see and edit everything you've added.",
    },
  },
  {
    element: '[data-tour="sl-form"]',
    popover: {
      title: "Changes apply instantly",
      description:
        "Fill a form — a salary change, a new recurring bill, an FD — and your forecast and net-worth chart update behind this panel.",
    },
  },
  {
    element: '[data-tour="sl-saved"]',
    popover: {
      title: "Save & switch scenarios",
      description:
        "Save your what-ifs as a named scenario, then switch between saved scenarios to compare them side by side.",
    },
  },
  {
    element: '[data-tour="sl-actions"]',
    popover: {
      title: "Back up, restore or reset",
      description:
        "Export a full snapshot to keep or move your plan, import one to restore it, or Reset to clear every change back to your baseline.",
    },
  },
  {
    popover: {
      title: "That's the Lab",
      description: "Make a scenario permanent later by rebuilding it as your base plan in the Builder.",
    },
  },
];

function stepsPresentInDom(): DriveStep[] {
  return STEPS.filter((step) => {
    const selector = typeof step.element === "string" ? step.element : null;
    return !selector || document.querySelector(selector) !== null;
  });
}

function run(steps: DriveStep[]): void {
  driver({
    showProgress: true,
    popoverClass: "wf-tour",
    stageRadius: 8,
    stagePadding: 8,
    steps,
  }).drive();
}

export function startScenarioTour(): void {
  const steps = stepsPresentInDom();
  if (steps.some((s) => typeof s.element === "string")) {
    run(steps);
    return;
  }
  // The Lab may still be mounting (lazy chunk / open animation) — retry once shortly.
  window.setTimeout(() => {
    const retry = stepsPresentInDom();
    if (retry.some((s) => typeof s.element === "string")) run(retry);
  }, 400);
}
