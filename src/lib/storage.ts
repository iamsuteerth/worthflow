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
  const { client, prefix } = await getClientAndPrefix()
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `${prefix}/manifest.json` })
    )
    const text = await res.Body?.transformToString()
    if (!text) return []
    return JSON.parse(text) as SaveFileMeta[]
  } catch (err: unknown) {
    const code = (err as { name?: string }).name
    if (code === 'NoSuchKey' || code === 'NotFound') return []
    throw err
  }
}

export async function saveManifest(entries: SaveFileMeta[]): Promise<void> {
  const { client, prefix } = await getClientAndPrefix()
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${prefix}/manifest.json`,
      Body: JSON.stringify(entries),
      ContentType: 'application/json',
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

export function generateSaveKey(email: string): string {
  const encoded = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${encoded}_${Date.now()}.wfplan`
}
