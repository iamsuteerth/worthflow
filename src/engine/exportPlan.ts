import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

import type {
  SavedScenario,
} from "../types/scenario";
export interface ExportedPlan {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  savedScenarios?: SavedScenario[];
}

export function exportPlan(
  data: ExportedPlan
) {
  const blob =
    new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            ...data,
          },
          null,
          2
        ),
      ],
      {
        type:
          "application/json",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download = `finance-plan-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  link.click();

  URL.revokeObjectURL(
    url
  );
}