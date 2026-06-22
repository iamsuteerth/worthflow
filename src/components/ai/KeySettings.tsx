import { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Collapse,
  Anchor,
  List,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconKey, IconShieldCheck, IconTrash } from '@tabler/icons-react';
import { useAiStore } from '@/store/aiStore';
import { AiError } from '@/ai/provider/types';
import { AI_PASSPHRASE_MIN } from '@/ai/config';

interface Props {
  onDone: () => void;
  forgotMode?: boolean;
}

function PassphraseWarning() {
  return (
    <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={14} />}>
      <Text size="xs">
        <b>There is no reset for this passphrase.</b> If you forget it, your saved AI key and chat are
        permanently unrecoverable. You'd need to re-enter your Gemini key and start a new chat.
      </Text>
    </Alert>
  );
}

function HardeningTips() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap={4}>
      <Anchor size="xs" onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
        {open ? 'Hide' : 'Show'} key hardening tips
      </Anchor>
      <Collapse expanded={open}>
        <Stack gap={6} p="xs" style={{ background: 'var(--mantine-color-default)', borderRadius: 8 }}>
          <Text size="xs" c="dimmed">
            To limit the blast radius of a leaked key, lock it to your site (about 2 minutes):
          </Text>
          <List type="ordered" size="xs" spacing={2}>
            <List.Item>
              Open <b>Google Cloud Console</b> &rarr; <b>APIs &amp; Services &rarr; Credentials</b>, and click your API key.
            </List.Item>
            <List.Item>
              Under <b>Application restrictions</b>, choose <b>HTTP referrers</b> and add your site
              (e.g. <code>https://worthflow.in/*</code>; add <code>http://localhost:*</code> only while developing).
            </List.Item>
            <List.Item>
              Under <b>API restrictions</b>, choose <b>Restrict key</b> and select the <b>Generative Language API</b> only.
            </List.Item>
            <List.Item>Click <b>Save</b> — now the key works only from your site, only for Gemini.</List.Item>
          </List>
          <Text size="xs">
            Tip: use a <b>dedicated key</b> for Worth Flow so you can revoke it independently.
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Your key is encrypted with your passphrase before it ever leaves your browser. We store only the
            encrypted form and can never read it.
          </Text>
        </Stack>
      </Collapse>
    </Stack>
  );
}

export default function KeySettings({ onDone, forgotMode = false }: Props) {
  const setupKey = useAiStore((s) => s.setupKey);
  const forgotPassphrase = useAiStore((s) => s.forgotPassphrase);
  const changePassphrase = useAiStore((s) => s.changePassphrase);
  const removeKey = useAiStore((s) => s.removeKey);
  const keyStatus = useAiStore((s) => s.keyStatus);

  const hasKey = keyStatus === 'ready' || keyStatus === 'locked' || keyStatus === 'invalid';

  const [apiKey, setApiKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  // For forgot mode: confirm dialog shown
  const [forgotConfirmed, setForgotConfirmed] = useState(false);

  // Change passphrase mode (when key is ready)
  const [changeMode, setChangeMode] = useState(false);

  function validatePassphrase(): string | null {
    if (passphrase.length < AI_PASSPHRASE_MIN) {
      return `Passphrase must be at least ${AI_PASSPHRASE_MIN} characters.`;
    }
    if (passphrase !== passphraseConfirm) {
      return "Passphrases don't match.";
    }
    return null;
  }

  async function handleSetup() {
    const err = validatePassphrase();
    if (err) { setError(err); return; }
    if (!apiKey.trim()) { setError('Please enter your Gemini API key.'); return; }

    setLoading(true);
    setError('');
    try {
      if (forgotMode && forgotConfirmed) {
        await forgotPassphrase(apiKey.trim(), passphrase);
      } else {
        await setupKey(apiKey.trim(), passphrase);
      }
      onDone();
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassphrase() {
    const err = validatePassphrase();
    if (err) { setError(err); return; }
    if (!oldPassphrase) { setError('Please enter your current passphrase.'); return; }

    setLoading(true);
    setError('');
    try {
      await changePassphrase(oldPassphrase, passphrase);
      setChangeMode(false);
      onDone();
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Failed to change passphrase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeKey();
      onDone();
    } catch {
      setError('Failed to remove key. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Forgot passphrase flow: show confirm dialog first
  if (forgotMode && !forgotConfirmed) {
    return (
      <Stack gap="md" p="md">
        <Title order={5}>Forgot Passphrase</Title>
        <Alert color="red" variant="filled" icon={<IconAlertTriangle size={14} />}>
          <Text size="sm">
            This permanently erases your saved AI chat and replaces your stored key. This cannot be undone.
          </Text>
        </Alert>
        <Text size="sm" c="dimmed">
          You'll need to re-enter a Gemini API key and set a new passphrase. Your chat history cannot be recovered.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>Cancel</Button>
          <Button color="red" onClick={() => setForgotConfirmed(true)}>
            Yes, I understand — continue
          </Button>
        </Group>
      </Stack>
    );
  }

  // Change passphrase mode
  if (changeMode) {
    return (
      <Stack gap="md" p="md">
        <Title order={5}>Change AI Passphrase</Title>
        <Text size="xs" c="dimmed">
          Your key and chat will be re-encrypted under the new passphrase. Chat history is preserved.
        </Text>

        <PasswordInput
          label="Current passphrase"
          value={oldPassphrase}
          onChange={(e) => setOldPassphrase(e.currentTarget.value)}
          disabled={loading}
        />
        <PasswordInput
          label="New passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.currentTarget.value)}
          disabled={loading}
        />
        <PasswordInput
          label="Confirm new passphrase"
          value={passphraseConfirm}
          onChange={(e) => setPassphraseConfirm(e.currentTarget.value)}
          disabled={loading}
          error={error}
        />
        <PassphraseWarning />
        {error && <Text size="xs" c="red">{error}</Text>}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setChangeMode(false)}>Cancel</Button>
          <Button onClick={handleChangePassphrase} loading={loading}>Update Passphrase</Button>
        </Group>
      </Stack>
    );
  }

  // Remove key confirm
  if (removeConfirm) {
    return (
      <Stack gap="md" p="md">
        <Title order={5}>Remove AI Key</Title>
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={14} />}>
          <Text size="sm">
            This deletes your stored API key <b>and your entire chat history</b>. This cannot be undone.
          </Text>
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setRemoveConfirm(false)}>Cancel</Button>
          <Button color="red" onClick={handleRemove} loading={loading} leftSection={<IconTrash size={14} />}>
            Remove Key & Chat
          </Button>
        </Group>
      </Stack>
    );
  }

  // Main setup / manage view
  return (
    <Stack gap="md" p="md">
      <Group gap="xs">
        <IconKey size={18} />
        <Title order={5}>{hasKey && !forgotMode ? 'Manage AI Key' : 'Add Your Gemini API Key'}</Title>
      </Group>

      {(!hasKey || forgotMode) && (
        <>
          <Text size="xs" c="dimmed">
            Your key never leaves your device in plaintext — it's encrypted with your passphrase
            before being stored.
          </Text>

          <Stack gap={4} p="xs" style={{ background: 'var(--mantine-color-default)', borderRadius: 8 }}>
            <Text size="xs" fw={500}>Get a free key:</Text>
            <List type="ordered" size="xs" spacing={2}>
              <List.Item>
                Open{' '}
                <Anchor href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">
                  Google AI Studio &rarr; API keys
                </Anchor>.
              </List.Item>
              <List.Item>Click <b>Create API key</b> (create a new project if asked).</List.Item>
              <List.Item>
                <b>Copy</b> the key (it starts with <code>AIza…</code>) and paste it below.
              </List.Item>
            </List>
            <Text size="xs" c="dimmed">The default free tier is enough for this assistant.</Text>
          </Stack>

          <TextInput
            label="Gemini API Key"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            disabled={loading}
          />

          <Divider />

          <Text size="xs" fw={500}>AI Passphrase</Text>
          <Text size="xs" c="dimmed">
            This passphrase encrypts your key and chat. It's separate from your account password.
          </Text>

          <PasswordInput
            label="Passphrase"
            placeholder={`At least ${AI_PASSPHRASE_MIN} characters`}
            value={passphrase}
            onChange={(e) => setPassphrase(e.currentTarget.value)}
            disabled={loading}
          />
          <PasswordInput
            label="Confirm passphrase"
            placeholder="Re-enter passphrase"
            value={passphraseConfirm}
            onChange={(e) => setPassphraseConfirm(e.currentTarget.value)}
            disabled={loading}
          />

          <PassphraseWarning />
          <HardeningTips />

          {error && <Text size="xs" c="red">{error}</Text>}

          <Group justify="flex-end">
            <Button variant="default" size="sm" onClick={onDone}>Cancel</Button>
            <Button
              leftSection={<IconShieldCheck size={14} />}
              onClick={handleSetup}
              loading={loading}
              size="sm"
            >
              {forgotMode ? 'Re-enter Key & Set Passphrase' : 'Encrypt & Save Key'}
            </Button>
          </Group>
        </>
      )}

      {hasKey && !forgotMode && (
        <>
          <Alert color="teal" variant="light" icon={<IconCheck size={14} />}>
            <Text size="xs">Your API key is encrypted and stored. The AI assistant is active.</Text>
          </Alert>

          <Stack gap={4}>
            <Text size="xs" fw={500}>What the AI sees</Text>
            <List size="xs" spacing={2} c="dimmed">
              <List.Item>
                Your forecast totals and a month-by-month series (condensed to year-end snapshots for
                very long plans)
              </List.Item>
              <List.Item>Account and FD/RD summaries</List.Item>
              <List.Item>Your active scenario, in plain language</List.Item>
            </List>
            <Text size="xs" c="dimmed">Never your credentials or internal IDs.</Text>
          </Stack>

          <HardeningTips />

          <Divider />

          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconKey size={12} />}
              onClick={() => setChangeMode(true)}
            >
              Change passphrase
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconTrash size={12} />}
              onClick={() => setRemoveConfirm(true)}
            >
              Remove key & chat
            </Button>
          </Group>

          <Button variant="default" size="sm" onClick={onDone} style={{ alignSelf: 'flex-end' }}>
            Done
          </Button>
        </>
      )}
    </Stack>
  );
}
