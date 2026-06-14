import type { PlannerOverrides }
  from "@/types/overrides";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  overrides: PlannerOverrides;
}