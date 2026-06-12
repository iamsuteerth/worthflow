import type {
  PlannerConfig,
} from "../types/config";

import type {
  PlannerOverrides,
} from "../types/overrides";

import type {
  SavedScenario,
} from "../types/scenario";

import {
  calculateChecksum,
} from "./checksum";

export interface ExportedPlan {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  savedScenarios?: SavedScenario[];
}

export async function exportPlan(
  data: ExportedPlan
) {
  const payload =
    btoa(
      JSON.stringify(data)
    );

  const exported = {
    app:
      "wealth-forecast",

    version: 2,

    exportedAt:
      new Date().toISOString(),

    payload,

    checksum:
      await calculateChecksum(
        payload
      ),
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          exported,
          null,
          2
        ),
      ],
      {
        type:
          "application/octet-stream",
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
    .slice(
      0,
      10
    )}.wfplan`;

  link.click();

  URL.revokeObjectURL(
    url
  );
}