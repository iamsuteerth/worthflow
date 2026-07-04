import type { ProviderId } from '@/ai/provider/types';

// ---------------------------------------------------------------------------
// The model catalog — the "locked down, expandable" allow-list the V4 ask calls
// for. This one table is the single source of which (provider, model) pairs are
// offered. Adding a model = one row here; nothing else. A key can only be saved
// against a catalog entry (unlisted model strings are rejected).
//
// Launch providers: Gemini (direct) + OpenRouter (aggregator). OpenRouter itself
// fronts OpenAI / Anthropic / Google / DeepSeek / Qwen / NVIDIA models, so a
// single OpenRouter key reaches all of them — no separate direct adapters needed.
// Every model carries a `tier` (free vs paid) so the picker leads with the free
// options and a dabbler is never surprised by a model that needs billing (e.g.
// Gemini 2.5 Pro, which is not on Google's free tier).
// ---------------------------------------------------------------------------

export type ModelTier = 'free' | 'paid';

export interface ModelEntry {
  providerId: ProviderId;
  modelId: string; // wire id, e.g. 'google/gemma-4-31b-it:free'
  label: string; // UI, e.g. 'Google Gemma 4 31B'
  tools: boolean; // supports native tool/function calling (matters in Phase B)
  promptCaching: boolean; // supports provider-side prefix caching
  tier?: ModelTier; // free vs paid — drives the Free/Paid grouping in the picker
  default?: boolean; // the default pick for that provider
  notes?: string; // short UI hint, e.g. 'fast / cheap'
}

export const MODEL_CATALOG: readonly ModelEntry[] = [
  // Gemini — the default provider; the existing flow is unchanged for these users.
  // Flash is on Google's free tier (the default); Pro needs billing enabled.
  { providerId: 'gemini', modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tools: true, promptCaching: true, tier: 'free', default: true, notes: 'fast / cheap' },
  { providerId: 'gemini', modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tools: true, promptCaching: true, tier: 'paid', notes: 'best reasoning' },

  // OpenRouter — FREE tier (an OpenRouter free key works; no credits needed).
  // Default pick = Gemma: the easiest zero-cost way to dabble.
  { providerId: 'openrouter', modelId: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B', tools: true, promptCaching: false, tier: 'free', default: true },
  { providerId: 'openrouter', modelId: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B', tools: true, promptCaching: false, tier: 'free' },
  { providerId: 'openrouter', modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'NVIDIA Nemotron 3 Ultra 550B', tools: true, promptCaching: false, tier: 'free' },
  { providerId: 'openrouter', modelId: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'NVIDIA Nemotron 3 Super 120B', tools: true, promptCaching: false, tier: 'free' },

  // OpenRouter — PAID tier (draws on your OpenRouter credits).
  { providerId: 'openrouter', modelId: 'openai/gpt-5.5', label: 'GPT-5.5', tools: true, promptCaching: false, tier: 'paid', notes: 'best reasoning' },
  { providerId: 'openrouter', modelId: 'openai/gpt-5.4', label: 'GPT-5.4', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'openai/gpt-5.2', label: 'GPT-5.2', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini', tools: true, promptCaching: false, tier: 'paid', notes: 'fast / cheap' },
  { providerId: 'openrouter', modelId: 'openai/gpt-5-mini', label: 'GPT-5 mini', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'openai/gpt-5.4-nano', label: 'GPT-5.4 nano', tools: true, promptCaching: false, tier: 'paid', notes: 'cheapest' },
  { providerId: 'openrouter', modelId: 'openai/gpt-4o-mini', label: 'GPT-4o mini', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', tools: true, promptCaching: false, tier: 'paid', notes: 'best reasoning' },
  { providerId: 'openrouter', modelId: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', tools: true, promptCaching: false, tier: 'paid', notes: 'fast / cheap' },
  { providerId: 'openrouter', modelId: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', tools: true, promptCaching: false, tier: 'paid' },
  { providerId: 'openrouter', modelId: 'qwen/qwen3.7-plus', label: 'Qwen 3.7 Plus', tools: true, promptCaching: false, tier: 'paid' },
] as const;

// Human-readable provider names, for UI copy and error messages. (The ProviderId
// union still carries anthropic/openai for future direct adapters, but they are
// not offered at launch — OpenRouter fronts those models instead.)
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Gemini',
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  mock: 'Mock',
};

export const DEFAULT_PROVIDER: ProviderId = 'gemini';

export function getModelsForProvider(providerId: ProviderId): ModelEntry[] {
  return MODEL_CATALOG.filter((m) => m.providerId === providerId);
}

export function getModelEntry(providerId: ProviderId, modelId: string): ModelEntry | undefined {
  return MODEL_CATALOG.find((m) => m.providerId === providerId && m.modelId === modelId);
}

// The default model for a provider — the row flagged `default`, else its first row.
export function getDefaultModel(providerId: ProviderId): ModelEntry | undefined {
  const models = getModelsForProvider(providerId);
  return models.find((m) => m.default) ?? models[0];
}

export function getDefaultModelId(providerId: ProviderId): string {
  return getDefaultModel(providerId)?.modelId ?? '';
}

export function isValidModel(providerId: ProviderId, modelId: string): boolean {
  return getModelEntry(providerId, modelId) !== undefined;
}

// A Mantine-shaped `data` array for a model Select. Every offered provider tags its
// models with a `tier`, so the picker comes back grouped Free-first — the free
// options lead and a paid pick is clearly labelled as such (no surprise billing).
// Returned as plain objects so the catalog stays UI-framework-free.
export type SelectItem = { value: string; label: string };
export type SelectGroup = { group: string; items: SelectItem[] };

function itemLabel(m: ModelEntry, withNotes: boolean): string {
  return withNotes && m.notes ? `${m.label} — ${m.notes}` : m.label;
}

// Provider-appropriate group headers, so "Paid" reads accurately for each provider
// (Google billing vs OpenRouter credits) rather than a one-size-fits-all label.
function tierGroupLabels(providerId: ProviderId): { free: string; paid: string } {
  if (providerId === 'openrouter') return { free: 'Free · no credits needed', paid: 'Paid · uses OpenRouter credits' };
  if (providerId === 'gemini') return { free: 'Free tier', paid: 'Paid · needs Google billing' };
  return { free: 'Free', paid: 'Paid' };
}

export function getModelSelectData(providerId: ProviderId): Array<SelectItem | SelectGroup> {
  const models = getModelsForProvider(providerId);
  // Group only when every model is tagged, so a partially-tagged provider can't
  // silently drop its untagged rows; such a provider falls back to a flat list.
  const tiered = models.length > 0 && models.every((m) => m.tier);
  if (!tiered) {
    return models.map((m) => ({ value: m.modelId, label: itemLabel(m, true) }));
  }
  const labels = tierGroupLabels(providerId);
  const groups: SelectGroup[] = [];
  const free = models.filter((m) => m.tier === 'free');
  const paid = models.filter((m) => m.tier === 'paid');
  if (free.length) groups.push({ group: labels.free, items: free.map((m) => ({ value: m.modelId, label: itemLabel(m, true) })) });
  if (paid.length) groups.push({ group: labels.paid, items: paid.map((m) => ({ value: m.modelId, label: itemLabel(m, true) })) });
  return groups;
}
