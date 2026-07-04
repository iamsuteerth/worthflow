import { useState } from 'react';
import type { ReactNode } from 'react';
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
  Select,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconKey, IconShieldCheck, IconTrash } from '@tabler/icons-react';
import { useAiStore } from '@/store/aiStore';
import { AiError } from '@/ai/provider/types';
import { AI_PASSPHRASE_MIN } from '@/ai/config';
import { getModelSelectData, getDefaultModelId, PROVIDER_LABELS } from '@/ai/provider/modelCatalog';
import { isProviderRegistered } from '@/ai/provider/index';

// BYOK providers offered in the picker, in display order (mock is never shown),
// filtered to those with a usable adapter in this build. Gemini is the default;
// OpenRouter is the opt-in path to many other models (free + paid) on one key.
type PickerProvider = 'gemini' | 'openrouter';
const PROVIDER_ORDER: PickerProvider[] = ['gemini', 'openrouter'];
const SELECTABLE_PROVIDERS: PickerProvider[] = PROVIDER_ORDER.filter((p) => isProviderRegistered(p));

// Per-provider setup copy: how to get a key, and how to harden it. The key vault
// is provider-agnostic; only this copy and the endpoint differ.
interface ProviderCopy {
  keyLabel: string;
  keyPlaceholder: string;
  getKey: { url: string; urlLabel: string; steps: ReactNode[]; free: boolean; freeNote?: string };
  hardening: { intro: string; steps?: ReactNode[]; note: ReactNode };
}

const PROVIDER_UI: Record<PickerProvider, ProviderCopy> = {
  gemini: {
    keyLabel: 'Gemini API Key',
    keyPlaceholder: 'AIza...',
    getKey: {
      url: 'https://aistudio.google.com/api-keys',
      urlLabel: 'Google AI Studio → API keys',
      free: true,
      freeNote: 'The default free tier is enough for this assistant.',
      steps: [
        <>Open the link above and sign in.</>,
        <>Click <b>Create API key</b> (create a new project if asked).</>,
        <><b>Copy</b> the key (it starts with <code>AIza…</code>) and paste it below.</>,
      ],
    },
    hardening: {
      intro: 'To limit the blast radius of a leaked key, lock it to your site (about 2 minutes):',
      steps: [
        <>Open <b>Google Cloud Console → APIs &amp; Services → Credentials</b>, and click your API key.</>,
        <>Under <b>Application restrictions</b>, choose <b>HTTP referrers</b> and add your site(s) — <code>https://worthflow.in/*</code> and <code>https://worthflow.vercel.app/*</code>.</>,
        <>Under <b>API restrictions</b>, choose <b>Restrict key</b> and select the <b>Generative Language API</b> only.</>,
        <>Click <b>Save</b> — the key now works only from your site, only for Gemini.</>,
      ],
      note: <>Tip: use a <b>dedicated key</b> for Worth Flow so you can revoke it independently.</>,
    },
  },
  openrouter: {
    keyLabel: 'OpenRouter API Key',
    keyPlaceholder: 'sk-or-...',
    getKey: {
      url: 'https://openrouter.ai/keys',
      urlLabel: 'OpenRouter → Keys',
      // You can use OpenRouter entirely for free by picking a Free model below.
      free: true,
      freeNote: 'Pick a model from the Free group below and it costs nothing — no credits needed.',
      steps: [
        <>Open the link above and sign in (no card needed to start).</>,
        <>Click <b>Create Key</b> — you can add credits later if you want paid models.</>,
        <><b>Copy</b> the key (it starts with <code>sk-or-…</code>) and paste it below.</>,
      ],
    },
    hardening: {
      intro: 'OpenRouter routes your request through its servers and on to the model host:',
      steps: [
        <>Your prompt and forecast figures transit <b>OpenRouter</b> <i>and</i> the model provider it routes to — not just one company.</>,
        <>Use a <b>dedicated key</b>; if you add credits, set a <b>spend limit</b> and a <b>referrer allow-list</b> on the key.</>,
      ],
      note: <>Want your data to reach only one company? Use <b>Gemini</b> instead — it talks to Google directly.</>,
    },
  },
};

interface Props {
  onDone: () => void;
  forgotMode?: boolean;
}

function PassphraseWarning() {
  return (
    <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={14} />}>
      <Text size="xs">
        <b>There is no reset for this passphrase.</b> If you forget it, your saved AI key and chat are
        permanently unrecoverable. You'd need to re-enter your API key and start a new chat.
      </Text>
    </Alert>
  );
}

function HardeningTips({ providerId }: { providerId: PickerProvider }) {
  const [open, setOpen] = useState(false);
  const { hardening } = PROVIDER_UI[providerId];
  return (
    <Stack gap={4}>
      <Anchor size="xs" onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
        {open ? 'Hide' : 'Show'} key hardening tips
      </Anchor>
      <Collapse expanded={open}>
        <Stack gap={6} p="xs" style={{ background: 'var(--mantine-color-default)', borderRadius: 8 }}>
          <Text size="xs" c="dimmed">{hardening.intro}</Text>
          {hardening.steps && (
            <List type="ordered" size="xs" spacing={2}>
              {hardening.steps.map((s, i) => (
                <List.Item key={i}>{s}</List.Item>
              ))}
            </List>
          )}
          <Text size="xs">{hardening.note}</Text>
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
  const keyBlob = useAiStore((s) => s.keyBlob);

  const hasKey = keyStatus === 'ready' || keyStatus === 'locked' || keyStatus === 'invalid';
  // The provider a stored key belongs to (mock never reaches this UI).
  const activeProviderId: PickerProvider =
    keyBlob && keyBlob.providerId === 'openrouter' ? 'openrouter' : 'gemini';

  const [providerId, setProviderId] = useState<PickerProvider>('gemini');
  const [modelId, setModelId] = useState(getDefaultModelId('gemini'));

  // Switching provider resets the model to that provider's default.
  function changeProvider(p: PickerProvider) {
    setProviderId(p);
    setModelId(getDefaultModelId(p));
  }

  const providerCopy = PROVIDER_UI[providerId];

  const [apiKey, setApiKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const [forgotConfirmed, setForgotConfirmed] = useState(false);

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
    if (!apiKey.trim()) { setError(`Please enter your ${providerCopy.keyLabel}.`); return; }

    setLoading(true);
    setError('');
    try {
      if (forgotMode && forgotConfirmed) {
        await forgotPassphrase(apiKey.trim(), passphrase, providerId, modelId);
      } else {
        await setupKey(apiKey.trim(), passphrase, providerId, modelId);
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
          You'll need to re-enter an API key and set a new passphrase. Your chat history cannot be recovered.
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

  return (
    <Stack gap="md" p="md">
      <Group gap="xs">
        <IconKey size={18} />
        <Title order={5}>
          {hasKey && !forgotMode ? 'Manage AI Key' : `Add Your ${providerCopy.keyLabel}`}
        </Title>
      </Group>

      {(!hasKey || forgotMode) && (
        <>
          <Text size="xs" c="dimmed">
            Your key never leaves your device in plaintext — it's encrypted with your passphrase
            before being stored.
          </Text>

          {SELECTABLE_PROVIDERS.length > 1 && (
            <Select
              label="Provider"
              description="Bring your own key from any of these. You can switch later by re-adding a key."
              data={SELECTABLE_PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
              value={providerId}
              onChange={(v) => v && changeProvider(v as PickerProvider)}
              disabled={loading}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          )}

          <Stack gap={4} p="xs" style={{ background: 'var(--mantine-color-default)', borderRadius: 8 }}>
            <Text size="xs" fw={500}>{providerCopy.getKey.free ? 'Get a free key:' : 'Get a key:'}</Text>
            <List type="ordered" size="xs" spacing={2}>
              <List.Item>
                Open{' '}
                <Anchor href={providerCopy.getKey.url} target="_blank" rel="noopener noreferrer">
                  {providerCopy.getKey.urlLabel}
                </Anchor>.
              </List.Item>
              {providerCopy.getKey.steps.map((s, i) => (
                <List.Item key={i}>{s}</List.Item>
              ))}
            </List>
            {providerCopy.getKey.free && providerCopy.getKey.freeNote && (
              <Text size="xs" c="dimmed">{providerCopy.getKey.freeNote}</Text>
            )}
          </Stack>

          <TextInput
            label={providerCopy.keyLabel}
            placeholder={providerCopy.keyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            disabled={loading}
          />

          <Select
            label="Model"
            description={
              providerId === 'openrouter'
                ? 'Free models cost nothing; paid models draw on your OpenRouter credits. Type to search.'
                : 'Flash is free; Pro needs billing enabled on your Google account.'
            }
            data={getModelSelectData(providerId)}
            value={modelId}
            onChange={(v) => v && setModelId(v)}
            disabled={loading}
            allowDeselect={false}
            searchable={providerId === 'openrouter'}
            nothingFoundMessage="No matching model"
            maxDropdownHeight={280}
            comboboxProps={{ withinPortal: true }}
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
          <HardeningTips providerId={providerId} />

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

          <HardeningTips providerId={activeProviderId} />

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
