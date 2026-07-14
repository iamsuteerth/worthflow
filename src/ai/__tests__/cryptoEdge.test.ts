import type { KeyBlob } from '@/ai/cloud/aiCloud';

import { describe, it, expect, beforeEach } from 'vitest';

import {
  deriveKek,
  aesGcmEncrypt,
  aesGcmDecrypt,
  randomBase64,
  randomBytes,
} from '@/ai/keyVault/crypto';
import {
  encryptNewKey,
  unlockWithPassphrase,
  activateKek,
  clearSessionKek,
  encryptWithSessionKek,
  decryptWithSessionKek,
} from '@/ai/keyVault/keyVault';

const full = (b: Omit<KeyBlob, 'providerId' | 'modelId' | 'createdAt' | 'updatedAt'>): KeyBlob => ({
  ...b,
  providerId: 'gemini',
  modelId: 'gemini-2.5-flash',
  createdAt: 'c',
  updatedAt: 'c',
});

beforeEach(() => clearSessionKek());

describe('crypto primitives — corner cases', () => {
  it('round-trips unicode passphrases and plaintexts (emoji, Devanagari, CJK)', async () => {
    const passphrase = 'पासवर्ड-密码-🔐-ω';
    const plaintext = 'AIza🔑-कुंजी-鍵';
    const { blob } = await encryptNewKey(plaintext, passphrase);
    expect(await unlockWithPassphrase(full(blob), passphrase)).toBe(plaintext);
  });

  it('round-trips an empty string plaintext', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    const { iv, ciphertext } = await aesGcmEncrypt(kek, '');
    expect(await aesGcmDecrypt(kek, iv, ciphertext)).toBe('');
  });

  it('rejects a tampered ciphertext (GCM authentication)', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    const { iv, ciphertext } = await aesGcmEncrypt(kek, 'secret');
    const tampered = ciphertext.slice(0, -4) + (ciphertext.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(aesGcmDecrypt(kek, iv, tampered)).rejects.toBeTruthy();
  });

  it('rejects decryption with a mismatched IV', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    const { ciphertext } = await aesGcmEncrypt(kek, 'secret');
    const otherIv = randomBase64(12);
    await expect(aesGcmDecrypt(kek, otherIv, ciphertext)).rejects.toBeTruthy();
  });

  it('uses a fresh IV per encryption (same plaintext, different ciphertext)', async () => {
    const kek = await deriveKek('passphrase1', randomBase64(16));
    const a = await aesGcmEncrypt(kek, 'same');
    const b = await aesGcmEncrypt(kek, 'same');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('deriveKek is deterministic for the same passphrase + salt', async () => {
    const salt = randomBase64(16);
    const k1 = await deriveKek('passphrase1', salt);
    const k2 = await deriveKek('passphrase1', salt);
    const { iv, ciphertext } = await aesGcmEncrypt(k1, 'cross-check');
    expect(await aesGcmDecrypt(k2, iv, ciphertext)).toBe('cross-check');
  });

  it('randomBytes/randomBase64 produce the requested length and vary per call', () => {
    expect(randomBytes(16)).toHaveLength(16);
    const a = randomBase64(16);
    const b = randomBase64(16);
    expect(atob(a)).toHaveLength(16);
    expect(a).not.toBe(b);
  });

  it('tampering with the stored blob surfaces as WRONG_PASSPHRASE, never a crash', async () => {
    const { blob } = await encryptNewKey('AIzaKEY', 'rightpass');
    const corrupt = { ...full(blob), ciphertext: blob.ciphertext.slice(0, -4) + 'AAAA' };
    await expect(unlockWithPassphrase(corrupt, 'rightpass')).rejects.toMatchObject({
      kind: 'WRONG_PASSPHRASE',
    });
  });

  it('corrupt chat ciphertext under a valid session maps to CHAT_DECRYPT', async () => {
    const { blob, kek } = await encryptNewKey('AIzaKEY', 'passphrase1');
    await activateKek(kek, blob.keyEpoch);
    const { iv, ciphertext, epoch } = await encryptWithSessionKek('{"v":1}');
    const bad = ciphertext.slice(0, -4) + (ciphertext.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(decryptWithSessionKek(iv, bad, epoch)).rejects.toMatchObject({ kind: 'CHAT_DECRYPT' });
  });
});
