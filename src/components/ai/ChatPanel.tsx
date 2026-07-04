import { useEffect, useState } from 'react';

import {
  ActionIcon,
  Alert,
  Box,
  Button,
  CloseButton,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
} from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';

import {
  IconDotsVertical,
  IconRefresh,
  IconSettings,
  IconShieldLock,
  IconSparkles,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import { useAiStore } from '@/store/aiStore';
import { useUiStore } from '@/store/uiStore';
import { getModelEntry, PROVIDER_LABELS } from '@/ai/provider/modelCatalog';
import MessageList from '@/components/ai/MessageList';
import MessageComposer from '@/components/ai/MessageComposer';
import UnlockPrompt from '@/components/ai/UnlockPrompt';
import KeySettings from '@/components/ai/KeySettings';

export default function ChatPanel() {
  const keyStatus = useAiStore((s) => s.keyStatus);
  const conversation = useAiStore((s) => s.conversation);
  const sending = useAiStore((s) => s.sending);
  const send = useAiStore((s) => s.send);
  const proposeAction = useAiStore((s) => s.proposeAction);
  const stopStreaming = useAiStore((s) => s.stopStreaming);
  const clearChat = useAiStore((s) => s.clearChat);
  const reloadChat = useAiStore((s) => s.reloadChat);
  const disclosureAcknowledged = useAiStore((s) => s.settings.disclosureAcknowledged);
  const acknowledgeDisclosure = useAiStore((s) => s.acknowledgeDisclosure);
  const keyBlob = useAiStore((s) => s.keyBlob);

  const closeAiPanel = useUiStore((s) => s.closeAiPanel);

  // Active provider/model, for provider-aware header + disclosure copy.
  const activeProviderId = keyBlob?.providerId;
  const activeModelLabel = keyBlob
    ? getModelEntry(keyBlob.providerId, keyBlob.modelId)?.label ?? keyBlob.modelId
    : '';
  const providerName =
    activeProviderId && activeProviderId !== 'mock' ? PROVIDER_LABELS[activeProviderId] : 'AI';
  // Where the forecast data actually goes, stated honestly per provider.
  const disclosureTarget =
    activeProviderId === 'openrouter'
      ? 'OpenRouter — and on to the model you chose —'
      : 'Google Gemini';

  useEffect(() => () => useAiStore.getState().stopStreaming(), []);

  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const isAbsent = keyStatus === 'absent';
  const isLocked = keyStatus === 'locked';
  const isReady = keyStatus === 'ready';
  const isValidating = keyStatus === 'validating';

  function handleForgotPassphrase() {
    setForgotMode(true);
    openSettings();
  }

  async function handleClearChat() {
    setClearConfirm(false);
    await clearChat();
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Group
        justify="space-between"
        p="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Group gap={8}>
          <IconSparkles size={18} />
          <Stack gap={0}>
            <Text fw={600} size="sm">AI Assistant</Text>
            <Text size="xs" c="dimmed">
              {isReady
                ? `${activeModelLabel || providerName} · Your key, your data`
                : isLocked
                ? 'Locked — enter your passphrase'
                : isAbsent
                ? 'Set up your AI key to start'
                : 'Validating…'}
            </Text>
          </Stack>
        </Group>

        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={reloadChat}
            disabled={!isReady}
            aria-label="Reload chat"
            title="Reload chat from cloud"
          >
            <IconRefresh size={14} />
          </ActionIcon>

          <Menu withinPortal position="bottom-end" shadow="sm">
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm" aria-label="Chat menu">
                <IconDotsVertical size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconSettings size={14} />}
                onClick={() => { setForgotMode(false); openSettings(); }}
              >
                AI Key Settings
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                disabled={!isReady}
                onClick={() => setClearConfirm(true)}
              >
                Clear chat history
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={closeAiPanel}
            aria-label="Close AI panel"
            title="Close"
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Keep the setup form mounted through 'validating' so a validation error
          (e.g. a 429 quota rejection) lands on the same instance and stays visible.
          KeySettings shows its own button spinner while the key is being checked. */}
      {(isAbsent || isValidating) && (
        <Box style={{ flex: 1, overflowY: 'auto' }}>
          <Stack p="md" gap="md">
            <Alert color="blue" variant="light" icon={<IconSparkles size={14} />}>
              <Text size="sm">
                Add an AI API key to enable the assistant — Gemini, or many models via OpenRouter. Your
                key is encrypted before leaving your browser.
              </Text>
            </Alert>
            <KeySettings onDone={closeSettings} />
          </Stack>
        </Box>
      )}

      {isLocked && (
        <Box style={{ flex: 1 }}>
          <UnlockPrompt onForgotPassphrase={handleForgotPassphrase} />
        </Box>
      )}

      {isReady && (
        <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {!disclosureAcknowledged && (
            <Alert
              color="indigo"
              variant="light"
              radius={0}
              icon={<IconShieldLock size={15} />}
              p="xs"
              styles={{ message: { width: '100%' } }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
                <Text size="xs">
                  Your forecast figures, account/instrument summaries and active scenario are sent to
                  {' '}{disclosureTarget} with <b>your</b> key. Your credentials and internal IDs never are.
                </Text>
                <CloseButton size="sm" aria-label="Dismiss notice" onClick={acknowledgeDisclosure} />
              </Group>
            </Alert>
          )}
          <MessageList
            messages={conversation.messages}
            summary={conversation.summary}
            sending={sending}
          />
          <MessageComposer onSend={send} onPropose={proposeAction} onStop={stopStreaming} sending={sending} />
        </Box>
      )}

      <Modal
        opened={settingsOpened}
        onClose={() => { closeSettings(); setForgotMode(false); }}
        title={forgotMode ? 'Forgot Passphrase' : 'AI Key Settings'}
        size="md"
      >
        <KeySettings
          onDone={() => { closeSettings(); setForgotMode(false); }}
          forgotMode={forgotMode}
        />
      </Modal>

      <Modal
        opened={clearConfirm}
        onClose={() => setClearConfirm(false)}
        title="Clear Chat History"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            This permanently deletes your entire chat history. Your AI key is not affected.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" size="sm" onClick={() => setClearConfirm(false)}>Cancel</Button>
            <Button color="red" size="sm" onClick={handleClearChat}>Clear History</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
