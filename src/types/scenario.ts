import type { PlannerOverrides }
  from "./overrides";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  overrides: PlannerOverrides;
}