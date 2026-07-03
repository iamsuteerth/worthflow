/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_MODE: 'mock' | 'cognito'
  readonly VITE_AWS_REGION: string
  readonly VITE_COGNITO_USER_POOL_ID?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
  readonly VITE_COGNITO_IDENTITY_POOL_ID?: string
  readonly VITE_S3_BUCKET_NAME: string
  readonly VITE_S3_ENDPOINT?: string
  readonly VITE_AI_ENABLED?: string
  readonly VITE_AI_PROVIDER?: 'mock' | 'gemini'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
