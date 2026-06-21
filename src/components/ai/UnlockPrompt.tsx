import { useState } from 'react';
import { Alert, Button, Group, PasswordInput, Stack, Text } from '@mantine/core';
import { IconLockOpen } from '@tabler/icons-react';
import { useAiStore } from '@/store/aiStore';
import { AiError } from '@/ai/provider/types';

interface Props {
  onForgotPassphrase: () => void;
}

export default function UnlockPrompt({ onForgotPassphrase }: Props) {
  const unlock = useAiStore((s) => s.unlock);

  const [passphrase, setPassphrase] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    if (!passphrase) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await unlock(passphrase);
    } catch (err) {
      if (err instanceof AiError && err.kind === 'WRONG_PASSPHRASE') {
        setErrorMsg("That passphrase doesn't match. Try again.");
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      setPassphrase('');
    }
  }

  return (
    <Stack gap="md" p="md">
      <Text fw={600} size="sm">Unlock AI Assistant</Text>

      <Text size="xs" c="dimmed">
        Enter your AI passphrase to unlock your key on this device. You won't need to enter it again on this device.
      </Text>

      <PasswordInput
        label="AI Passphrase"
        placeholder="Enter your passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        disabled={loading}
        error={errorMsg || undefined}
        autoFocus
      />

      {errorMsg && (
        <Alert color="red" variant="light" radius="md">
          <Text size="xs">{errorMsg}</Text>
        </Alert>
      )}

      <Group justify="space-between">
        <Button variant="subtle" size="xs" c="dimmed" onClick={onForgotPassphrase}>
          Forgot passphrase?
        </Button>
        <Button
          leftSection={<IconLockOpen size={14} />}
          size="sm"
          onClick={handleUnlock}
          loading={loading}
          disabled={!passphrase}
        >
          Unlock
        </Button>
      </Group>
    </Stack>
  );
}
