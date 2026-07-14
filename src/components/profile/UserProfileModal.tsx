import {
  Avatar,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCloudOff, IconCloudUpload, IconLogout } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { SaveDialog } from "./SaveDialog";
import { SaveFileCard } from "./SaveFileCard";
import { EmptyState, SectionLabel } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { useCloudStore, SAVE_LIMIT } from "@/store/cloudStore";
import { usePlannerStore } from "@/store/plannerStore";
import { getInitials, formatDate } from "@/utils/display";

interface UserProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

export function UserProfileModal({ opened, onClose }: UserProfileModalProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const saves = useCloudStore((state) => state.saves);
  const savesLoading = useCloudStore((state) => state.savesLoading);
  const savesError = useCloudStore((state) => state.savesError);
  const loadSaves = useCloudStore((state) => state.loadSaves);
  const loadSave = useCloudStore((state) => state.loadSave);
  const downloadSave = useCloudStore((state) => state.downloadSave);
  const deleteSave = useCloudStore((state) => state.deleteSave);

  const [saveDialogOpened, { open: openSaveDialog, close: closeSaveDialog }] = useDisclosure(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [pendingLoadKey, setPendingLoadKey] = useState<string | null>(null);

  const pendingDelete = saves.find((s) => s.key === pendingDeleteKey);

  useEffect(() => {
    if (opened) loadSaves();
  }, [opened, loadSaves]);

  if (!user) return null;

  const initials = getInitials(user.email);
  const atLimit = saves.length >= SAVE_LIMIT;

  async function handleSignOut() {
    onClose();
    await signOut();
  }

  function handleLoad(key: string) {
    if (usePlannerStore.getState().isPlanDirty()) {
      setPendingLoadKey(key);
    } else {
      void doLoad(key);
    }
  }

  async function doLoad(key: string) {
    try {
      await loadSave(key);
      notifications.show({ message: "Plan loaded.", color: "teal" });
      onClose();
    } catch {
      notifications.show({ message: "Failed to load save.", color: "red" });
    }
  }

  async function confirmLoad() {
    if (!pendingLoadKey) return;
    const key = pendingLoadKey;
    setPendingLoadKey(null);
    await doLoad(key);
  }

  async function handleDownload(key: string, label: string) {
    try {
      await downloadSave(key, label);
    } catch {
      notifications.show({ message: "Failed to download save.", color: "red" });
    }
  }

  function handleDelete(key: string) {
    setPendingDeleteKey(key);
  }

  async function confirmDelete() {
    if (!pendingDeleteKey) return;
    try {
      await deleteSave(pendingDeleteKey);
      notifications.show({ message: "Save deleted.", color: "teal" });
    } catch {
      notifications.show({ message: "Failed to delete save.", color: "red" });
    } finally {
      setPendingDeleteKey(null);
    }
  }

  return (
    <>
      <Modal opened={opened} onClose={onClose} title="Profile" size="lg">
        <Stack gap="lg">
          <Group>
            <Avatar radius="xl" size="lg" color="brand">
              {initials}
            </Avatar>
            <Stack gap={2}>
              <Text fw={600}>{user.email}</Text>
              <Text size="sm" c="dimmed">
                Member since {formatDate(user.memberSince)}
              </Text>
            </Stack>
          </Group>

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between">
              <SectionLabel>Cloud Saves</SectionLabel>
              <Group gap="sm">
                <Text size="xs" c="dimmed">{saves.length} / {SAVE_LIMIT} used</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="brand"
                  leftSection={<IconCloudUpload size={14} />}
                  onClick={openSaveDialog}
                >
                  Save current plan
                </Button>
              </Group>
            </Group>

            {savesLoading && (
              <>
                <SaveFileCard isPlaceholder label="" networth={0} timeframeMonths={0} createdAt="" />
                <SaveFileCard isPlaceholder label="" networth={0} timeframeMonths={0} createdAt="" />
              </>
            )}

            {!savesLoading && savesError && (
              <Text size="sm" c="red">{savesError}</Text>
            )}

            {!savesLoading && !savesError && saves.length === 0 && (
              <EmptyState
                icon={<IconCloudOff size={24} />}
                title="No cloud saves yet"
                description="Save your current plan to access it from anywhere."
              />
            )}

            {!savesLoading && saves.map((s) => (
              <SaveFileCard
                key={s.key}
                label={s.label}
                networth={s.networth}
                timeframeMonths={s.timeframeMonths}
                createdAt={s.createdAt}
                onLoad={() => handleLoad(s.key)}
                onDownload={() => handleDownload(s.key, s.label)}
                onDelete={() => handleDelete(s.key)}
              />
            ))}
          </Stack>

          <Divider />

          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleSignOut}
            justify="flex-start"
          >
            Sign out
          </Button>
        </Stack>
      </Modal>

      <SaveDialog
        opened={saveDialogOpened}
        onClose={closeSaveDialog}
        existingSaves={saves}
        atLimit={atLimit}
      />

      <Modal
        opened={pendingDeleteKey !== null}
        onClose={() => setPendingDeleteKey(null)}
        title="Delete save"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete{" "}
            <strong>{pendingDelete?.label}</strong>? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setPendingDeleteKey(null)}>Cancel</Button>
            <Button color="red" onClick={confirmDelete}>Delete</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={pendingLoadKey !== null}
        onClose={() => setPendingLoadKey(null)}
        title="Replace current plan?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Loading this save will replace your current plan. Any unsaved changes will be lost.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setPendingLoadKey(null)}>Cancel</Button>
            <Button color="brand" onClick={confirmLoad}>Load anyway</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
