import { describe, it, expect, vi, beforeEach } from 'vitest';

// A legacy v1 (Gemini-only) blob as it would sit in S3 today, plus a knob to
// swap in a v2 blob for the pass-through case. The mock reads from this holder.
const h = vi.hoisted(() => ({
  body: null as string | null,
}));

vi.mock('@/lib/storage', () => ({
  getUserObject: async () => ({ body: h.body, etag: null }),
  putUserObject: async () => null,
  deleteUserObject: async () => {},
}));

import { getKeyBlob } from '@/ai/cloud/aiCloud';
import { getDefaultModelId } from '@/ai/provider/modelCatalog';

const V1_BLOB = {
  v: 1,
  providerId: 'gemini',
  keyEpoch: 'epoch-1',
  kdf: { algo: 'PBKDF2', hash: 'SHA-256', iterations: 600_000 },
  salt: 's',
  iv: 'i',
  ciphertext: 'c',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

beforeEach(() => {
  h.body = null;
});

describe('KeyBlob v1 → v2 migration (read path)', () => {
  it('reads a legacy v1 blob as v2, binding it to Gemini + the default model', async () => {
    h.body = JSON.stringify(V1_BLOB);
    const blob = await getKeyBlob();
    expect(blob).not.toBeNull();
    expect(blob!.v).toBe(2);
    expect(blob!.providerId).toBe('gemini');
    expect(blob!.modelId).toBe(getDefaultModelId('gemini'));
    // Crypto material is preserved verbatim so the existing chat stays readable.
    expect(blob!.keyEpoch).toBe('epoch-1');
    expect(blob!.salt).toBe('s');
    expect(blob!.iv).toBe('i');
    expect(blob!.ciphertext).toBe('c');
    expect(blob!.kdf.iterations).toBe(600_000);
  });

  it('passes a v2 blob through unchanged', async () => {
    const v2 = { ...V1_BLOB, v: 2, providerId: 'anthropic', modelId: 'claude-sonnet-4-6' };
    h.body = JSON.stringify(v2);
    const blob = await getKeyBlob();
    expect(blob!.v).toBe(2);
    expect(blob!.providerId).toBe('anthropic');
    expect(blob!.modelId).toBe('claude-sonnet-4-6');
  });

  it('returns null for a corrupt blob', async () => {
    h.body = '{ not json';
    expect(await getKeyBlob()).toBeNull();
  });

  it('returns null when absent', async () => {
    h.body = null;
    expect(await getKeyBlob()).toBeNull();
  });
});
