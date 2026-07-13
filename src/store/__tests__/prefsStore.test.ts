import { describe, it, expect, beforeEach } from "vitest";

import { usePrefsStore } from "@/store/prefsStore";

beforeEach(() => {
  usePrefsStore.getState().resetForecastTour();
});

describe("prefsStore", () => {
  it("defaults to not-seen and toggles the forecast-tour flag", () => {
    expect(usePrefsStore.getState().hasSeenForecastTour).toBe(false);

    usePrefsStore.getState().markForecastTourSeen();
    expect(usePrefsStore.getState().hasSeenForecastTour).toBe(true);

    usePrefsStore.getState().resetForecastTour();
    expect(usePrefsStore.getState().hasSeenForecastTour).toBe(false);
  });
});
