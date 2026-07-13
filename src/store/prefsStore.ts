import { create } from "zustand";
import { persist } from "zustand/middleware";

// Device-local, non-secret UI preferences. Kept separate from plannerStore (plan data) and
// aiStore (whose persisted keys are test-locked). Own localStorage key + allow-listed
// partialize so only known flags are ever written.
interface PrefsState {
  hasSeenForecastTour: boolean;
  markForecastTourSeen: () => void;
  resetForecastTour: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      hasSeenForecastTour: false,
      markForecastTourSeen: () => set({ hasSeenForecastTour: true }),
      resetForecastTour: () => set({ hasSeenForecastTour: false }),
    }),
    {
      name: "worth-flow-prefs-v1",
      partialize: (s) => ({ hasSeenForecastTour: s.hasSeenForecastTour }),
    }
  )
);
