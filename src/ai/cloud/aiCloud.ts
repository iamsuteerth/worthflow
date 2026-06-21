import { getUserObject, putUserObject, deleteUserObject } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface KeyBlob {
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
    return JSON.parse(body) as KeyBlob;
  } catch {
    // Corrupted blob — treat as absent (aiStore will surface an error note)
    return null;
  }
}

export async function putKeyBlob(blob: KeyBlob): Promise<void> {
  await putUserObject(KEY_BLOB_PATH, JSON.stringify(blob));
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
export async function putConversation(
  envelope: EncryptedEnvelope,
  ifMatch: string | null | undefined,
): Promise<void> {
  await putUserObject(CONVERSATION_PATH, JSON.stringify(envelope), 'application/json', ifMatch);
}

export async function deleteConversation(): Promise<void> {
  await deleteUserObject(CONVERSATION_PATH);
}
