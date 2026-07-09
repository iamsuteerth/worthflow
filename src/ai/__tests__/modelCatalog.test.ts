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

// The BYOK providers offered (mock is never in the picker).
const OFFERED: ProviderId[] = ['gemini'];

describe('modelCatalog — integrity', () => {
  it('every entry is well-formed', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.modelId.trim().length).toBeGreaterThan(0);
      expect(m.label.trim().length).toBeGreaterThan(0);
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
    expect(getModelEntry('mock', 'nope')).toBeUndefined();
  });

  it('pins the Gemini default so v1 blobs migrate to a real model', () => {
    // The KeyBlob v1→v2 migration binds legacy Gemini blobs to this id.
    expect(isValidModel('gemini', getDefaultModelId('gemini'))).toBe(true);
  });

  it('every model is tagged free or paid', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.tier === 'free' || m.tier === 'paid').toBe(true);
    }
  });

  it('tags Gemini Flash free (the default) and Pro paid', () => {
    // Pro is not on Google's free tier, so it must be flagged paid in the picker.
    expect(getModelEntry('gemini', 'gemini-2.5-flash')?.tier).toBe('free');
    expect(getDefaultModelId('gemini')).toBe('gemini-2.5-flash');
    expect(getModelEntry('gemini', 'gemini-2.5-pro')?.tier).toBe('paid');
  });

  it('groups every provider Free-first, with a Paid group when present', () => {
    for (const p of OFFERED) {
      const data = getModelSelectData(p);
      expect('group' in data[0]).toBe(true);
      expect((data[0] as { group: string }).group.toLowerCase()).toContain('free');
      const paidGroup = data.find((d) => 'group' in d && (d as { group: string }).group.toLowerCase().includes('paid'));
      expect(paidGroup).toBeDefined();
    }
  });
});
