import {
  Alert,
  Button,
  Group,
  Modal,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useCloudStore, SAVE_LIMIT, SAVE_LIMIT_ERROR, type SaveFileMeta } from "@/store/cloudStore";

interface SaveDialogProps {
  opened: boolean;
  onClose: () => void;
  existingSaves: SaveFileMeta[];
  atLimit: boolean;
}

type SaveMode = "new" | "overwrite";

export function SaveDialog({ opened, onClose, existingSaves, atLimit }: SaveDialogProps) {
  const [mode, setMode] = useState<SaveMode>("new");
  const [label, setLabel] = useState("");
  const [overwriteKey, setOverwriteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const uploadCurrentPlan = useCloudStore((state) => state.uploadCurrentPlan);

  // At the save limit, a new save is impossible — force overwrite-only.
  const effectiveMode: SaveMode = atLimit ? "overwrite" : mode;

  function handleClose() {
    setLabel("");
    setOverwriteKey(null);
    setError("");
    setMode("new");
    onClose();
  }

  async function handleSave() {
    if (effectiveMode === "new" && !label.trim()) {
      setError("Please enter a label for this save.");
      return;
    }
    if (effectiveMode === "overwrite" && !overwriteKey) {
      setError("Please select a save to overwrite.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (effectiveMode === "new") {
        await uploadCurrentPlan(label.trim());
        notifications.show({ message: "Plan saved to cloud.", color: "teal" });
      } else {
        const existing = existingSaves.find((s) => s.key === overwriteKey);
        await uploadCurrentPlan(existing?.label ?? label.trim(), overwriteKey ?? undefined);
        notifications.show({ message: "Save overwritten.", color: "teal" });
      }
      handleClose();
    } catch (err) {
      if (err instanceof Error && err.message === SAVE_LIMIT_ERROR) {
        setError(`You've reached the ${SAVE_LIMIT}-save limit. Overwrite or delete a save.`);
      } else {
        setError("Failed to save. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const selectData = existingSaves.map((s) => ({ value: s.key, label: s.label }));

  return (
    <Modal opened={opened} onClose={handleClose} title="Save to Cloud" size="sm">
      <Stack gap="md">
        <Radio.Group value={effectiveMode} onChange={(v) => { setMode(v as SaveMode); setError(""); }}>
          <Group gap="md">
            <Radio value="new" label="New save" disabled={atLimit} />
            <Radio value="overwrite" label="Overwrite existing" disabled={existingSaves.length === 0} />
          </Group>
        </Radio.Group>

        {atLimit && (
          <Text size="xs" c="dimmed">
            You've reached the {SAVE_LIMIT}-save limit. Overwrite an existing save, or delete one to add a new save.
          </Text>
        )}

        {effectiveMode === "new" && (
          <TextInput
            label="Label"
            placeholder="e.g. 5-year conservative plan"
            value={label}
            onChange={(e) => { setLabel(e.currentTarget.value); setError(""); }}
          />
        )}

        {effectiveMode === "overwrite" && (
          <Select
            label="Replace existing save"
            placeholder="Select a save"
            data={selectData}
            value={overwriteKey}
            onChange={(v) => { setOverwriteKey(v); setError(""); }}
          />
        )}

        {error && <Alert color="red" radius="md">{error}</Alert>}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          <Button
            color={effectiveMode === "overwrite" ? "orange" : "brand"}
            onClick={handleSave}
            loading={loading}
          >
            {effectiveMode === "new" ? "Save to Cloud" : "Overwrite"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
