import { describe, it, expect } from 'vitest';
import {
  MODEL_CATALOG,
  PROVIDER_LABELS,
  getModelsForProvider,
  getModelEntry,
  getDefaultModel,
  getDefaultModelId,
  getModelSelectData,
  isValidModel,
} from '@/ai/provider/modelCatalog';
import type { ProviderId } from '@/ai/provider/types';

// The BYOK providers offered at launch (mock is never in the picker).
const OFFERED: ProviderId[] = ['gemini', 'openrouter'];

describe('modelCatalog — integrity', () => {
  it('every entry is well-formed', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.modelId.trim().length).toBeGreaterThan(0);
      expect(m.label.trim().length).toBeGreaterThan(0);
      expect(typeof m.tools).toBe('boolean');
      expect(typeof m.promptCaching).toBe('boolean');
      expect(OFFERED).toContain(m.providerId);
    }
  });

  it('has no duplicate (provider, modelId) pairs', () => {
    const seen = new Set<string>();
    for (const m of MODEL_CATALOG) {
      const key = `${m.providerId}::${m.modelId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('every offered provider has models and a resolvable default', () => {
    for (const p of OFFERED) {
      const models = getModelsForProvider(p);
      expect(models.length).toBeGreaterThan(0);
      const def = getDefaultModel(p);
      expect(def).toBeDefined();
      expect(isValidModel(p, def!.modelId)).toBe(true);
      expect(getDefaultModelId(p)).toBe(def!.modelId);
      // At most one row may carry the explicit `default` flag per provider.
      expect(models.filter((m) => m.default).length).toBeLessThanOrEqual(1);
    }
  });

  it('every offered provider has a human label', () => {
    for (const p of OFFERED) {
      expect(PROVIDER_LABELS[p].trim().length).toBeGreaterThan(0);
    }
  });

  it('rejects unlisted (provider, model) pairs', () => {
    expect(isValidModel('gemini', 'not-a-real-model')).toBe(false);
    expect(getModelEntry('anthropic', 'nope')).toBeUndefined();
  });

  it('pins the Gemini default so v1 blobs migrate to a real model', () => {
    // The KeyBlob v1→v2 migration binds legacy Gemini blobs to this id.
    expect(isValidModel('gemini', getDefaultModelId('gemini'))).toBe(true);
  });

  it('defaults OpenRouter to a free-tier model (the dabbler path)', () => {
    const def = getDefaultModel('openrouter');
    expect(def?.tier).toBe('free');
    expect(def?.modelId).toBe('google/gemma-4-31b-it:free');
  });

  it('every OpenRouter model is tagged free or paid', () => {
    for (const m of getModelsForProvider('openrouter')) {
      expect(m.tier === 'free' || m.tier === 'paid').toBe(true);
    }
  });

  it('groups OpenRouter select data Free-first; Gemini stays a flat list', () => {
    const or = getModelSelectData('openrouter');
    expect('group' in or[0]).toBe(true);
    expect((or[0] as { group: string }).group.toLowerCase()).toContain('free');

    const gem = getModelSelectData('gemini');
    expect('value' in gem[0]).toBe(true); // flat items, not groups
  });
});
