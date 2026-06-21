import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { cacheKek, loadKek, clearKek } from '@/ai/keyVault/kekCache';
import { deriveKek, randomBase64 } from '@/ai/keyVault/crypto';

describe('kekCache (IndexedDB)', () => {
  beforeEach(async () => {
    await clearKek();
  });

  it('stores and loads a non-extractable CryptoKey with its epoch', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    await cacheKek(kek, 'epoch-1');
    const loaded = await loadKek();
    expect(loaded?.keyEpoch).toBe('epoch-1');
    expect(loaded?.kek).toBeInstanceOf(CryptoKey);
    expect(loaded?.kek.extractable).toBe(false);
  });

  it('returns null after clear', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    await cacheKek(kek, 'epoch-2');
    await clearKek();
    expect(await loadKek()).toBeNull();
  });

  it('keeps a single active slot (latest write wins)', async () => {
    const k1 = await deriveKek('a1pass', randomBase64(16));
    const k2 = await deriveKek('b2pass', randomBase64(16));
    await cacheKek(k1, 'e1');
    await cacheKek(k2, 'e2');
    expect((await loadKek())?.keyEpoch).toBe('e2');
  });

  it('a cached key remains usable for decryption (handle survives the round-trip)', async () => {
    const salt = randomBase64(16);
    const kek = await deriveKek('passphrase1', salt);
    await cacheKek(kek, 'epoch-3');
    const loaded = await loadKek();
    const enc = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      loaded!.kek,
      new TextEncoder().encode('hi'),
    );
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, kek, enc);
    expect(new TextDecoder().decode(dec)).toBe('hi');
  });
});
