import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

export interface SaveFileMeta {
  key: string
  label: string
  networth: number
  timeframeMonths: number
  createdAt: string
}

async function getClientAndPrefix(): Promise<{ client: S3Client; prefix: string }> {
  if (import.meta.env.VITE_AUTH_MODE === 'mock') {
    const { useAuthStore } = await import('@/store/authStore')
    const userId = useAuthStore.getState().user?.userId ?? 'mock-anonymous'
    const client = new S3Client({
      region: import.meta.env.VITE_AWS_REGION,
      endpoint: import.meta.env.VITE_S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: 'mock', secretAccessKey: 'mock' },
    })
    return { client, prefix: `users/${userId}` }
  }

  const { fetchAuthSession } = await import('aws-amplify/auth')
  const session = await fetchAuthSession()
  const client = new S3Client({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: session.credentials,
  })
  return { client, prefix: `users/${session.identityId}` }
}

const BUCKET = import.meta.env.VITE_S3_BUCKET_NAME

export async function loadManifest(): Promise<SaveFileMeta[]> {
  return (await loadManifestWithETag()).entries
}

// Returns the manifest plus its S3 ETag, so a subsequent write can be made
// conditional. ETag is null when the manifest doesn't exist yet.
export async function loadManifestWithETag(): Promise<{
  entries: SaveFileMeta[]
  etag: string | null
}> {
  const { client, prefix } = await getClientAndPrefix()
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `${prefix}/manifest.json` })
    )
    const text = await res.Body?.transformToString()
    const entries = text ? (JSON.parse(text) as SaveFileMeta[]) : []
    return { entries, etag: res.ETag ?? null }
  } catch (err: unknown) {
    const code = (err as { name?: string }).name
    if (code === 'NoSuchKey' || code === 'NotFound') return { entries: [], etag: null }
    throw err
  }
}

// When `ifMatch` is provided, the write is conditional: `IfMatch` for an update,
// `IfNoneMatch: *` for a create. S3 returns 412 PreconditionFailed if the manifest
// changed underneath us, letting the caller re-read and retry.
// Conditional writes are skipped in mock mode (LocalStack v3 doesn't enforce them).
export async function saveManifest(
  entries: SaveFileMeta[],
  ifMatch?: string | null
): Promise<void> {
  const { client, prefix } = await getClientAndPrefix()
  const conditional =
    import.meta.env.VITE_AUTH_MODE !== 'mock' && ifMatch !== undefined
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${prefix}/manifest.json`,
      Body: JSON.stringify(entries),
      ContentType: 'application/json',
      ...(conditional ? (ifMatch ? { IfMatch: ifMatch } : { IfNoneMatch: '*' }) : {}),
    })
  )
}

export async function uploadSave(key: string, content: string): Promise<void> {
  const { client, prefix } = await getClientAndPrefix()
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${prefix}/${key}`,
      Body: content,
      ContentType: 'application/octet-stream',
    })
  )
}

export async function downloadSave(key: string): Promise<string> {
  const { client, prefix } = await getClientAndPrefix()
  const res = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: `${prefix}/${key}` })
  )
  return (await res.Body?.transformToString()) ?? ''
}

export async function deleteSave(key: string): Promise<void> {
  const { client, prefix } = await getClientAndPrefix()
  await client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: `${prefix}/${key}` })
  )
}

export function generateSaveKey(): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.wfplan`
}

// ---------------------------------------------------------------------------
// Generic per-user object helpers (used by ai/cloud/aiCloud.ts).
// These operate outside the save manifest and do not affect the 5-save cap.
// ---------------------------------------------------------------------------

export interface GetObjectResult {
  body: string | null
  etag: string | null
}

export async function getUserObject(key: string): Promise<GetObjectResult> {
  const { client, prefix } = await getClientAndPrefix()
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `${prefix}/${key}` })
    )
    const body = (await res.Body?.transformToString()) ?? null
    return { body, etag: res.ETag ?? null }
  } catch (err: unknown) {
    const code = (err as { name?: string }).name
    if (code === 'NoSuchKey' || code === 'NotFound') return { body: null, etag: null }
    throw err
  }
}

// `ifMatch`: undefined = unconditional; null = IfNoneMatch:* (create only); string = IfMatch (update only)
// `tagging`: URL-encoded S3 tag string (e.g. "ObjectType=ai") — applied to the stored object
export async function putUserObject(
  key: string,
  body: string,
  contentType = 'application/json',
  ifMatch?: string | null,
  tagging?: string,
): Promise<string | null> {
  const { client, prefix } = await getClientAndPrefix()
  const isMock = import.meta.env.VITE_AUTH_MODE === 'mock'
  const useConditional = !isMock && ifMatch !== undefined
  const res = await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${prefix}/${key}`,
      Body: body,
      ContentType: contentType,
      ...(useConditional ? (ifMatch ? { IfMatch: ifMatch } : { IfNoneMatch: '*' }) : {}),
      ...(tagging ? { Tagging: tagging } : {}),
    })
  )
  return (res as { ETag?: string }).ETag ?? null
}

export async function deleteUserObject(key: string): Promise<void> {
  const { client, prefix } = await getClientAndPrefix()
  await client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: `${prefix}/${key}` })
  )
}
