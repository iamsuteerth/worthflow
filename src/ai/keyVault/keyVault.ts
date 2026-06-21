import { randomBase64, deriveKek, aesGcmEncrypt, aesGcmDecrypt } from '@/ai/keyVault/crypto';
import { cacheKek, loadKek, clearKek } from '@/ai/keyVault/kekCache';
import { AiError } from '@/ai/provider/types';
import type { KeyBlob } from '@/ai/cloud/aiCloud';

export type KeyStatus = 'absent' | 'locked' | 'ready' | 'validating' | 'invalid';

// Session-scoped: the non-extractable KEK + epoch, held in memory only.
// This is set when the key is unlocked and cleared on sign-out.
let _sessionKek: CryptoKey | null = null;
let _sessionEpoch: string | null = null;

export function getSessionKek(): { kek: CryptoKey; epoch: string } | null {
  if (_sessionKek && _sessionEpoch) return { kek: _sessionKek, epoch: _sessionEpoch };
  return null;
}

export function clearSessionKek(): void {
  _sessionKek = null;
  _sessionEpoch = null;
}

async function tryLoadKekFromCache(blobEpoch: string): Promise<CryptoKey | null> {
  try {
    const cached = await loadKek();
    if (!cached) return null;
    if (cached.keyEpoch !== blobEpoch) {
      // Stale cache — the key was re-minted elsewhere. Discard it.
      await clearKek();
      return null;
    }
    return cached.kek;
  } catch {
    // IndexedDB unavailable (private browsing). Fall through to passphrase path.
    return null;
  }
}

async function persistKek(kek: CryptoKey, epoch: string): Promise<void> {
  _sessionKek = kek;
  _sessionEpoch = epoch;
  try {
    await cacheKek(kek, epoch);
  } catch {
    // IndexedDB unavailable: the session KEK is in memory only.
    // The caller shows a one-time warning via aiStore.
  }
}

export async function resolveKeyStatus(blob: KeyBlob | null): Promise<{ status: KeyStatus; kekLoaded: boolean }> {
  if (!blob) return { status: 'absent', kekLoaded: false };

  // Try cached KEK first (same epoch).
  const cached = await tryLoadKekFromCache(blob.keyEpoch);
  if (cached) {
    _sessionKek = cached;
    _sessionEpoch = blob.keyEpoch;
    return { status: 'ready', kekLoaded: true };
  }

  // Blob exists but no valid cached KEK → needs passphrase.
  return { status: 'locked', kekLoaded: false };
}

export async function unlockWithPassphrase(blob: KeyBlob, passphrase: string): Promise<string> {
  const kek = await deriveKek(passphrase, blob.salt);
  try {
    const plaintext = await aesGcmDecrypt(kek, blob.iv, blob.ciphertext);
    await persistKek(kek, blob.keyEpoch);
    return plaintext;
  } catch {
    throw new AiError('WRONG_PASSPHRASE', "That passphrase doesn't match. Try again.");
  }
}

export async function revealKey(blob: KeyBlob): Promise<string> {
  const session = getSessionKek();
  if (!session) throw new AiError('KEY_LOCKED', 'Key is locked. Enter your passphrase.');
  if (session.epoch !== blob.keyEpoch) throw new AiError('KEY_LOCKED', 'Key epoch mismatch. Re-enter passphrase.');
  return aesGcmDecrypt(session.kek, blob.iv, blob.ciphertext);
}

export interface EncryptKeyResult {
  blob: Omit<KeyBlob, 'providerId' | 'createdAt' | 'updatedAt'>;
  kek: CryptoKey;
}

export async function encryptNewKey(plaintextApiKey: string, passphrase: string): Promise<EncryptKeyResult> {
  const salt = randomBase64(16);
  const keyEpoch = crypto.randomUUID();
  const kek = await deriveKek(passphrase, salt);
  const { iv, ciphertext } = await aesGcmEncrypt(kek, plaintextApiKey);
  return {
    blob: { v: 1, keyEpoch, kdf: { algo: 'PBKDF2', hash: 'SHA-256', iterations: 600_000 }, salt, iv, ciphertext },
    kek,
  };
}

export async function reEncryptKeyWithNewPassphrase(
  blob: KeyBlob,
  oldPassphrase: string,
  newPassphrase: string,
): Promise<KeyBlob> {
  // Decrypt with old passphrase
  const oldKek = await deriveKek(oldPassphrase, blob.salt);
  let plaintext: string;
  try {
    plaintext = await aesGcmDecrypt(oldKek, blob.iv, blob.ciphertext);
  } catch {
    throw new AiError('WRONG_PASSPHRASE', "Old passphrase is incorrect.");
  }

  // Re-encrypt with new passphrase (new salt, same keyEpoch — no re-keying)
  const newSalt = randomBase64(16);
  const newKek = await deriveKek(newPassphrase, newSalt);
  const { iv: newIv, ciphertext: newCiphertext } = await aesGcmEncrypt(newKek, plaintext);

  await persistKek(newKek, blob.keyEpoch);
  return {
    ...blob,
    salt: newSalt,
    iv: newIv,
    ciphertext: newCiphertext,
    updatedAt: new Date().toISOString(),
  };
}

/** Directly activate a known KEK (avoids a re-derivation after setup/re-key). */
export async function activateKek(kek: CryptoKey, epoch: string): Promise<void> {
  await persistKek(kek, epoch);
}

export async function clearAllKekState(): Promise<void> {
  clearSessionKek();
  try {
    await clearKek();
  } catch {
    // Best-effort
  }
}

export async function encryptWithSessionKek(plaintext: string): Promise<{ iv: string; ciphertext: string; epoch: string }> {
  const session = getSessionKek();
  if (!session) throw new AiError('KEY_LOCKED', 'Key is locked.');
  const { iv, ciphertext } = await aesGcmEncrypt(session.kek, plaintext);
  return { iv, ciphertext, epoch: session.epoch };
}

export async function decryptWithSessionKek(ivB64: string, ciphertextB64: string, epoch: string): Promise<string> {
  const session = getSessionKek();
  if (!session) throw new AiError('KEY_LOCKED', 'Key is locked.');
  if (session.epoch !== epoch) throw new AiError('CHAT_DECRYPT', 'Key epoch mismatch.');
  try {
    return await aesGcmDecrypt(session.kek, ivB64, ciphertextB64);
  } catch {
    throw new AiError('CHAT_DECRYPT', "Couldn't decrypt chat. The data may be corrupt.");
  }
}
