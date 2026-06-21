export type AiErrorKind =
  | 'NO_KEY'
  | 'KEY_LOCKED'
  | 'WRONG_PASSPHRASE'
  | 'WEAK_PASSPHRASE'
  | 'INVALID_KEY'
  | 'CHAT_DECRYPT'
  | 'RATE_LIMIT'
  | 'QUOTA'
  | 'NETWORK'
  | 'MALFORMED_RESPONSE'
  | 'INVALID_ACTION'
  | 'NO_CONTEXT'
  | 'CLOUD_SYNC'
  | 'PROVIDER_DOWN'
  | 'UNKNOWN';

export class AiError extends Error {
  readonly kind: AiErrorKind;
  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
  }
}

export interface AiRequest {
  systemPrompt: string;
  contextBlock: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  userMessage: string;
  expectAction?: boolean;
}

export interface AiStreamChunk {
  textDelta: string;
}

export interface AIProvider {
  readonly id: 'gemini' | 'mock';
  complete(
    req: AiRequest,
    key: string,
    signal?: AbortSignal,
  ): AsyncIterable<AiStreamChunk>;
  validateKey(key: string, signal?: AbortSignal): Promise<boolean>;
}
