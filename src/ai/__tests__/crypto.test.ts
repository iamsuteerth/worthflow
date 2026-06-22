import { describe, it, expect } from 'vitest';
import {
  deriveKek,
  aesGcmEncrypt,
  aesGcmDecrypt,
  randomBase64,
  randomBytes,
} from '@/ai/keyVault/crypto';

describe('crypto', () => {
  it('round-trips encrypt → decrypt with a derived KEK', async () => {
    const kek = await deriveKek('correct horse battery', randomBase64(16));
    const { iv, ciphertext } = await aesGcmEncrypt(kek, 'AIzaSecretKey123');
    expect(await aesGcmDecrypt(kek, iv, ciphertext)).toBe('AIzaSecretKey123');
  });

  it('fails to decrypt with a wrong passphrase (AES-GCM auth-tag failure)', async () => {
    const salt = randomBase64(16);
    const right = await deriveKek('right-pass', salt);
    const { iv, ciphertext } = await aesGcmEncrypt(right, 'secret');
    const wrong = await deriveKek('wrong-pass', salt);
    await expect(aesGcmDecrypt(wrong, iv, ciphertext)).rejects.toBeTruthy();
  });

  it('derives an interoperable key from the same passphrase + salt', async () => {
    const salt = randomBase64(16);
    const a = await deriveKek('pp', salt);
    const b = await deriveKek('pp', salt);
    const enc = await aesGcmEncrypt(a, 'hello');
    expect(await aesGcmDecrypt(b, enc.iv, enc.ciphertext)).toBe('hello');
  });

  it('derives a different key for a different salt', async () => {
    const a = await deriveKek('pp', randomBase64(16));
    const b = await deriveKek('pp', randomBase64(16));
    const enc = await aesGcmEncrypt(a, 'hello');
    await expect(aesGcmDecrypt(b, enc.iv, enc.ciphertext)).rejects.toBeTruthy();
  });

  it('uses a fresh iv for every encryption', async () => {
    const kek = await deriveKek('pp', randomBase64(16));
    const e1 = await aesGcmEncrypt(kek, 'x');
    const e2 = await aesGcmEncrypt(kek, 'x');
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });

  it('round-trips unicode plaintext (₹, lakh, emoji)', async () => {
    const kek = await deriveKek('pp', randomBase64(16));
    const text = '₹1,00,000 — net worth 📈 lakh/crore';
    const { iv, ciphertext } = await aesGcmEncrypt(kek, text);
    expect(await aesGcmDecrypt(kek, iv, ciphertext)).toBe(text);
  });

  it('produces non-extractable keys', async () => {
    const kek = await deriveKek('pp', randomBase64(16));
    expect(kek.extractable).toBe(false);
  });

  it('honours the iteration count: same count interoperates, a different count does not', async () => {
    const salt = randomBase64(16);
    const a = await deriveKek('pp', salt, 50_000);
    const b = await deriveKek('pp', salt, 50_000);
    const enc = await aesGcmEncrypt(a, 'AIzaSecret');
    // Same passphrase + salt + iterations → interoperable.
    expect(await aesGcmDecrypt(b, enc.iv, enc.ciphertext)).toBe('AIzaSecret');
    // A different iteration count derives a different key and cannot decrypt.
    const other = await deriveKek('pp', salt, 60_000);
    await expect(aesGcmDecrypt(other, enc.iv, enc.ciphertext)).rejects.toBeTruthy();
  });

  it('randomBytes / randomBase64 return the requested size', () => {
    expect(randomBytes(16).length).toBe(16);
    // 16 bytes → 24 base64 chars (with padding)
    expect(randomBase64(16).length).toBe(24);
  });
});
