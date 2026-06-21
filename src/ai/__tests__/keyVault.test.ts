import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptNewKey,
  revealKey,
  unlockWithPassphrase,
  reEncryptKeyWithNewPassphrase,
  getSessionKek,
  clearSessionKek,
  activateKek,
  encryptWithSessionKek,
  decryptWithSessionKek,
  resolveKeyStatus,
} from '@/ai/keyVault/keyVault';
import type { KeyBlob } from '@/ai/cloud/aiCloud';

type PartialBlob = Awaited<ReturnType<typeof encryptNewKey>>['blob'];
const full = (b: PartialBlob): KeyBlob => ({
  ...b,
  providerId: 'gemini',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

beforeEach(() => clearSessionKek());

describe('keyVault', () => {
  it('encryptNewKey → activate → reveal round-trips the API key', async () => {
    const { blob, kek } = await encryptNewKey('AIzaTESTKEY', 'passphrase1');
    await activateKek(kek, blob.keyEpoch);
    expect(await revealKey(full(blob))).toBe('AIzaTESTKEY');
  });

  it('mints a fresh keyEpoch + salt per setup', async () => {
    const a = await encryptNewKey('AIzaX', 'passphrase1');
    const b = await encryptNewKey('AIzaX', 'passphrase1');
    expect(a.blob.keyEpoch).not.toBe(b.blob.keyEpoch);
    expect(a.blob.salt).not.toBe(b.blob.salt);
  });

  it('revealKey throws KEY_LOCKED with no session', async () => {
    const { blob } = await encryptNewKey('AIzaX', 'passphrase1');
    clearSessionKek();
    await expect(revealKey(full(blob))).rejects.toMatchObject({ kind: 'KEY_LOCKED' });
  });

  it('revealKey throws KEY_LOCKED on epoch mismatch', async () => {
    const { blob, kek } = await encryptNewKey('AIzaX', 'passphrase1');
    await activateKek(kek, 'a-different-epoch');
    await expect(revealKey(full(blob))).rejects.toMatchObject({ kind: 'KEY_LOCKED' });
  });

  it('unlockWithPassphrase decrypts + sets the session; wrong passphrase fails closed', async () => {
    const { blob } = await encryptNewKey('AIzaKEY', 'rightpass');
    clearSessionKek();
    const blobFull = full(blob);
    await expect(unlockWithPassphrase(blobFull, 'wrongpass')).rejects.toMatchObject({
      kind: 'WRONG_PASSPHRASE',
    });
    expect(await unlockWithPassphrase(blobFull, 'rightpass')).toBe('AIzaKEY');
    expect(getSessionKek()?.epoch).toBe(blob.keyEpoch);
  });

  it('reEncryptKeyWithNewPassphrase preserves the key + keyEpoch', async () => {
    const { blob } = await encryptNewKey('AIzaKEEP', 'oldpass11');
    const rewrapped = await reEncryptKeyWithNewPassphrase(full(blob), 'oldpass11', 'newpass22');
    expect(rewrapped.keyEpoch).toBe(blob.keyEpoch); // passphrase change keeps the epoch
    expect(rewrapped.salt).not.toBe(blob.salt); // but uses a fresh salt
    clearSessionKek();
    expect(await unlockWithPassphrase(rewrapped, 'newpass22')).toBe('AIzaKEEP');
  });

  it('reEncrypt with the wrong old passphrase fails', async () => {
    const { blob } = await encryptNewKey('AIzaX', 'oldpass11');
    await expect(
      reEncryptKeyWithNewPassphrase(full(blob), 'badold', 'newpass22'),
    ).rejects.toMatchObject({ kind: 'WRONG_PASSPHRASE' });
  });

  it('session encrypt/decrypt round-trips and rejects epoch mismatch', async () => {
    const { blob, kek } = await encryptNewKey('AIzaX', 'passphrase1');
    await activateKek(kek, blob.keyEpoch);
    const { iv, ciphertext, epoch } = await encryptWithSessionKek('chat-json');
    expect(epoch).toBe(blob.keyEpoch);
    expect(await decryptWithSessionKek(iv, ciphertext, epoch)).toBe('chat-json');
    await expect(decryptWithSessionKek(iv, ciphertext, 'other-epoch')).rejects.toMatchObject({
      kind: 'CHAT_DECRYPT',
    });
  });

  it('resolveKeyStatus: absent for null, locked for a blob with no cached KEK', async () => {
    expect(await resolveKeyStatus(null)).toEqual({ status: 'absent', kekLoaded: false });
    const { blob } = await encryptNewKey('AIzaX', 'passphrase1');
    clearSessionKek();
    expect(await resolveKeyStatus(full(blob))).toEqual({ status: 'locked', kekLoaded: false });
  });
});
