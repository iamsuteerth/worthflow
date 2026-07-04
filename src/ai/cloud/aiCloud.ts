import { getUserObject, putUserObject, deleteUserObject } from '@/lib/storage';
import type { ProviderId } from '@/ai/provider/types';
import { getDefaultModelId } from '@/ai/provider/modelCatalog';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

// v1: the original Gemini-only blob (still readable on disk; migrated in memory).
interface KeyBlobV1 {
  v: 1;
  providerId: 'gemini';
  keyEpoch: string;
  kdf: { algo: 'PBKDF2'; hash: 'SHA-256'; iterations: number };
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
}

// v2: adds a widened providerId + the catalog wire id the key is bound to.
// This is the in-memory + on-disk shape from V4 on. `KeyBlob` is the current
// shape everything else uses; the reader migrates v1 → v2 transparently.
export interface KeyBlobV2 {
  v: 2;
  providerId: ProviderId;
  modelId: string;
  keyEpoch: string;
  kdf: { algo: 'PBKDF2'; hash: 'SHA-256'; iterations: number };
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
}

export type KeyBlob = KeyBlobV2;

// Carry a v1 Gemini blob forward: same crypto material, provider pinned to
// 'gemini', model defaulted to the Gemini default. Never re-keys (epoch kept),
// so the existing chat stays readable. The v2 form is written back lazily on the
// next blob write (change-passphrase / re-key / setup) — no forced migration.
function migrateKeyBlob(raw: KeyBlobV1 | KeyBlobV2): KeyBlob {
  if (raw.v === 2) return raw;
  return {
    ...raw,
    v: 2,
    providerId: 'gemini',
    modelId: getDefaultModelId('gemini'),
  };
}

export interface EncryptedEnvelope {
  v: 1;
  keyEpoch: string;
  iv: string;
  ciphertext: string;
}

// ---------------------------------------------------------------------------
// S3 paths (relative to the per-user prefix)
// ---------------------------------------------------------------------------

const KEY_BLOB_PATH = 'ai/keyblob.json';
const CONVERSATION_PATH = 'ai/conversation.json';

// ---------------------------------------------------------------------------
// aiCloud — moves ciphertext to/from S3. Never sees plaintext or KEK.
// ---------------------------------------------------------------------------

export async function getKeyBlob(): Promise<KeyBlob | null> {
  const { body } = await getUserObject(KEY_BLOB_PATH);
  if (!body) return null;
  try {
    return migrateKeyBlob(JSON.parse(body) as KeyBlobV1 | KeyBlobV2);
  } catch {
    // Corrupted blob — treat as absent (aiStore will surface an error note)
    return null;
  }
}

export async function putKeyBlob(blob: KeyBlob): Promise<void> {
  await putUserObject(KEY_BLOB_PATH, JSON.stringify(blob), 'application/json', undefined, 'ObjectType=ai');
}

export async function deleteKeyBlob(): Promise<void> {
  await deleteUserObject(KEY_BLOB_PATH);
}

export async function getConversation(): Promise<{ envelope: EncryptedEnvelope | null; etag: string | null }> {
  const { body, etag } = await getUserObject(CONVERSATION_PATH);
  if (!body) return { envelope: null, etag: null };
  try {
    return { envelope: JSON.parse(body) as EncryptedEnvelope, etag };
  } catch {
    return { envelope: null, etag };
  }
}

// `ifMatch`: null = create (IfNoneMatch:*); string = update (IfMatch); undefined = unconditional
// Returns the new ETag from S3 (store it so the next write can be conditional).
export async function putConversation(
  envelope: EncryptedEnvelope,
  ifMatch: string | null | undefined,
): Promise<string | null> {
  return putUserObject(CONVERSATION_PATH, JSON.stringify(envelope), 'application/json', ifMatch, 'ObjectType=ai');
}

export async function deleteConversation(): Promise<void> {
  await deleteUserObject(CONVERSATION_PATH);
}
