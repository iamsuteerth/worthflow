import {
  Avatar,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCloudUpload, IconLogout } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCloudStore } from "@/store/cloudStore";
import { EmptyState, SectionLabel } from "@/components/ui";
import { SaveFileCard } from "./SaveFileCard";
import { SaveDialog } from "./SaveDialog";

interface UserProfileModalProps {
  opened: boolean;
  onClose: () => void;
}

function getInitials(email: string): string {
  return (email.split("@")[0]?.[0] ?? "?").toUpperCase();
}

function formatMemberSince(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

  const pendingDelete = saves.find((s) => s.key === pendingDeleteKey);

  useEffect(() => {
    if (opened) loadSaves();
  }, [opened, loadSaves]);

  if (!user) return null;

  const initials = getInitials(user.email);
  const atLimit = saves.length >= 5;

  async function handleSignOut() {
    onClose();
    await signOut();
  }

  async function handleLoad(key: string) {
    try {
      await loadSave(key);
      notifications.show({ message: "Plan loaded.", color: "teal" });
      onClose();
    } catch {
      notifications.show({ message: "Failed to load save.", color: "red" });
    }
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
                Member since {formatMemberSince(user.memberSince)}
              </Text>
            </Stack>
          </Group>

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between">
              <SectionLabel>Cloud Saves</SectionLabel>
              <Group gap="sm">
                <Text size="xs" c="dimmed">{saves.length} / 5 used</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="brand"
                  leftSection={<IconCloudUpload size={14} />}
                  onClick={openSaveDialog}
                  disabled={atLimit}
                >
                  Save current plan
                </Button>
              </Group>
            </Group>

            {savesLoading && (
              <Group justify="center" py="md">
                <Loader size="sm" color="brand" />
              </Group>
            )}

            {!savesLoading && savesError && (
              <Text size="sm" c="red">{savesError}</Text>
            )}

            {!savesLoading && !savesError && saves.length === 0 && (
              <EmptyState
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
    </>
  );
}
