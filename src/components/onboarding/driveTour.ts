import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/onboarding/tour.css";

// While a tour runs, block user-initiated scrolling (wheel + touch) so the spotlight stays
// aligned with its target. driver.js still scrolls elements into view programmatically, which
// does not dispatch these events, so guided navigation keeps working.
function preventScroll(event: Event) {
  event.preventDefault();
}

function lockScroll() {
  window.addEventListener("wheel", preventScroll, { passive: false });
  window.addEventListener("touchmove", preventScroll, { passive: false });
}

function unlockScroll() {
  window.removeEventListener("wheel", preventScroll);
  window.removeEventListener("touchmove", preventScroll);
}

// Shared driver setup: Mantine-themed popover (see tour.css), rounded highlight, and the
// scroll lock above. Callers pass their steps and any extra config (e.g. section-driving
// onNextClick/onPrevClick, or an onDestroyed to mark a tour seen).
export function runTour(steps: DriveStep[], extra: Partial<Config> = {}): void {
  const { onDestroyed, ...rest } = extra;
  lockScroll();
  driver({
    showProgress: true,
    popoverClass: "wf-tour",
    stageRadius: 8,
    stagePadding: 8,
    allowClose: true,
    ...rest,
    steps,
    onDestroyed: (element, step, opts) => {
      unlockScroll();
      onDestroyed?.(element, step, opts);
    },
  }).drive();
}
