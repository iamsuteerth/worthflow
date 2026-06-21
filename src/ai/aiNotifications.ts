import { notifications } from '@mantine/notifications';

export function notifyAiCloudSyncFailed() {
  notifications.show({
    color: 'orange',
    message: "Couldn't sync your AI chat. You can keep chatting; we'll retry.",
    autoClose: 5000,
  });
}

export function notifyAiKeyRemoved() {
  notifications.show({
    color: 'teal',
    message: 'AI key and chat removed.',
  });
}

export function notifyAiKeySetup() {
  notifications.show({
    color: 'teal',
    message: 'AI assistant enabled. Your key is encrypted and stored securely.',
  });
}

export function notifyAiPassphraseChanged() {
  notifications.show({
    color: 'teal',
    message: 'AI passphrase updated. Your key and chat have been re-encrypted.',
  });
}

export function notifyIndexedDbUnavailable() {
  notifications.show({
    color: 'yellow',
    message: "Your device can't cache the AI key locally. You'll need to enter your passphrase each session.",
    autoClose: 8000,
  });
}

export function notifyAiChatCompacted() {
  notifications.show({
    color: 'blue',
    message: 'Older messages were summarized to keep this chat going.',
    autoClose: 4000,
  });
}

export function notifyAiActionApplied() {
  notifications.show({
    color: 'teal',
    message: 'Change applied to your scenario. You can undo it from the chat.',
    autoClose: 5000,
  });
}

export function notifyAiActionUndone() {
  notifications.show({
    color: 'gray',
    message: 'Change undone.',
    autoClose: 3000,
  });
}
