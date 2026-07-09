import type { ProviderId } from '@/ai/provider/types';

// ---------------------------------------------------------------------------
// The model catalog — the locked, expandable allow-list of offered (provider,
// model) pairs. This one table is the single source of truth. Adding a model =
// one row here; nothing else. A key can only be saved against a catalog entry
// (unlisted model strings are rejected).
//
// Provider: Gemini (direct). Every model carries a `tier` (free vs paid) so the
// picker leads with the free option and a user is never surprised by a model that
// needs billing (Gemini 2.5 Pro is not on Google's free tier).
// ---------------------------------------------------------------------------

export type ModelTier = 'free' | 'paid';

export interface ModelEntry {
  providerId: ProviderId;
  modelId: string; // wire id, e.g. 'gemini-2.5-flash'
  label: string; // UI, e.g. 'Gemini 2.5 Flash'
  tier?: ModelTier; // free vs paid — drives the Free/Paid grouping in the picker
  default?: boolean; // the default pick for that provider
  notes?: string; // short UI hint, e.g. 'fast / cheap'
}

export const MODEL_CATALOG: readonly ModelEntry[] = [
  // Gemini — Flash is on Google's free tier (the default); Pro needs billing enabled.
  { providerId: 'gemini', modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'free', default: true, notes: 'fast / cheap' },
  { providerId: 'gemini', modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'paid', notes: 'best reasoning' },
] as const;

// Human-readable provider names, for UI copy and error messages.
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Gemini',
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

// A Mantine-shaped `data` array for a model Select. When every model is tagged with
// a `tier`, the picker comes back grouped Free-first — the free option leads and a
// paid pick is clearly labelled (no surprise billing). Returned as plain objects so
// the catalog stays UI-framework-free.
export type SelectItem = { value: string; label: string };
export type SelectGroup = { group: string; items: SelectItem[] };

function itemLabel(m: ModelEntry, withNotes: boolean): string {
  return withNotes && m.notes ? `${m.label} — ${m.notes}` : m.label;
}

function tierGroupLabels(providerId: ProviderId): { free: string; paid: string } {
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
