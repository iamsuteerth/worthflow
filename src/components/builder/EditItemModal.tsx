import type { ReactNode } from "react";

import { Button, Group, Modal, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";

// Shared wrapper for the Builder's "edit an existing item" modals. The field inputs (with
// their constraints) live in the shared *Fields components so Add and Edit stay identical;
// this only supplies the frame, the disabled-until-valid Save, and Cancel.
interface Props {
  opened: boolean;
  title: string;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
}

export default function EditItemModal({ opened, title, canSave, onSave, onClose, children }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="lg">
      <Stack gap="md">
        {children}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" leftSection={<IconX size={16} />} onClick={onClose}>
            Cancel
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} disabled={!canSave} onClick={onSave}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
