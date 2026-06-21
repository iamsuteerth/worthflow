import { AI_KDF_ITERATIONS } from '@/ai/config';

// Returns a Uint8Array backed by a plain ArrayBuffer (not SharedArrayBuffer),
// which is required by the WebCrypto API on TypeScript ≥5.6.
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return view;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(length);
  return crypto.getRandomValues(new Uint8Array(buf));
}

export function randomBase64(length: number): string {
  return bytesToBase64(randomBytes(length));
}

export async function deriveKek(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations: AI_KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
}

export async function aesGcmEncrypt(kek: CryptoKey, plaintext: string): Promise<{ iv: string; ciphertext: string }> {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    enc.encode(plaintext),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function aesGcmDecrypt(kek: CryptoKey, ivB64: string, ciphertextB64: string): Promise<string> {
  const dec = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivB64) },
    kek,
    base64ToBytes(ciphertextB64),
  );
  return dec.decode(decrypted);
}
