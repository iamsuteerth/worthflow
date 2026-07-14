import { notifications } from "@mantine/notifications";

import { SAVE_LIMIT } from "@/store/cloudStore";

const usage = (used: number) => `${used} of ${SAVE_LIMIT} cloud slots used.`;

export function notifyCloudSaved(used: number) {
  notifications.show({ color: "teal", message: `Plan saved to cloud — ${usage(used)}` });
}

export function notifyCloudOverwritten(used: number) {
  notifications.show({ color: "teal", message: `Save updated — ${usage(used)}` });
}

export function notifyCloudAutoSaveFailed() {
  notifications.show({
    color: "red",
    message: "Couldn't auto-save your plan to the cloud. Open Profile → Save to retry.",
  });
}

export function notifyGeneratedNudge() {
  notifications.show({
    color: "brand",
    message: "Forecast generated. Open Profile → Save to keep it as a new cloud plan.",
  });
}

export function notifyPlanOutOfWindow() {
  notifications.show({
    color: "yellow",
    title: "Plan opened in the builder",
    message:
      "Some accounts or events fall outside this plan's forecast window. Adjust them (or the timeline) and regenerate.",
  });
}
