import type {
  PlannerConfig,
} from "@/types/config";

import type {
  PlannerOverrides,
} from "@/types/overrides";

import type {
  SavedScenario,
} from "@/types/scenario";

import {
  calculateChecksum,
} from "@/engine/checksum";

import {
  encodeBase64,
} from "@/engine/base64";

export interface ExportedPlan {
  baseConfig: PlannerConfig;
  overrides: PlannerOverrides;
  savedScenarios?: SavedScenario[];
  // Undo/redo stacks travel with the file so the scenario timeline is identical after
  // a manual export → import, matching the cloud save path (cloudStore.serializePlan).
  // importPlan validates this as optional; a freshly generated plan omits it.
  history?: { past: PlannerOverrides[]; future: PlannerOverrides[] };
}

export async function exportPlan(
  data: ExportedPlan
) {
  const payload =
    encodeBase64(
      JSON.stringify(data)
    );

  const exported = {
    app:
      "wealth-forecast",

    version: 3,

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