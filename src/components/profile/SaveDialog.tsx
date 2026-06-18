import {
  Alert,
  Button,
  Group,
  Modal,
  Radio,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useCloudStore, type SaveFileMeta } from "@/store/cloudStore";

interface SaveDialogProps {
  opened: boolean;
  onClose: () => void;
  existingSaves: SaveFileMeta[];
}

type SaveMode = "new" | "overwrite";

export function SaveDialog({ opened, onClose, existingSaves }: SaveDialogProps) {
  const [mode, setMode] = useState<SaveMode>("new");
  const [label, setLabel] = useState("");
  const [overwriteKey, setOverwriteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const uploadCurrentPlan = useCloudStore((state) => state.uploadCurrentPlan);

  function handleClose() {
    setLabel("");
    setOverwriteKey(null);
    setError("");
    setMode("new");
    onClose();
  }

  async function handleSave() {
    if (mode === "new" && !label.trim()) {
      setError("Please enter a label for this save.");
      return;
    }
    if (mode === "overwrite" && !overwriteKey) {
      setError("Please select a save to overwrite.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (mode === "new") {
        await uploadCurrentPlan(label.trim());
        notifications.show({ message: "Plan saved to cloud.", color: "teal" });
      } else {
        const existing = existingSaves.find((s) => s.key === overwriteKey);
        await uploadCurrentPlan(existing?.label ?? label.trim(), overwriteKey ?? undefined);
        notifications.show({ message: "Save overwritten.", color: "teal" });
      }
      handleClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectData = existingSaves.map((s) => ({ value: s.key, label: s.label }));

  return (
    <Modal opened={opened} onClose={handleClose} title="Save to Cloud" size="sm">
      <Stack gap="md">
        <Radio.Group value={mode} onChange={(v) => { setMode(v as SaveMode); setError(""); }}>
          <Group gap="md">
            <Radio value="new" label="New save" />
            <Radio value="overwrite" label="Overwrite existing" disabled={existingSaves.length === 0} />
          </Group>
        </Radio.Group>

        {mode === "new" && (
          <TextInput
            label="Label"
            placeholder="e.g. 5-year conservative plan"
            value={label}
            onChange={(e) => { setLabel(e.currentTarget.value); setError(""); }}
          />
        )}

        {mode === "overwrite" && (
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
            color={mode === "overwrite" ? "orange" : "brand"}
            onClick={handleSave}
            loading={loading}
          >
            {mode === "new" ? "Save to Cloud" : "Overwrite"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
