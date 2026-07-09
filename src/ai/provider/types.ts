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

export function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null | undefined)?.name === 'AbortError';
}

// The BYOK providers the app can reach. Gemini is the sole live provider; `mock`
// is the offline/test stand-in. Which (provider, model) pairs are *offered* is the
// model catalog.
export type ProviderId = 'gemini' | 'mock';

// What an adapter can do, so the UI can adapt per provider/model.
export interface ProviderCapabilities {
  promptCaching: boolean; // provider-side prefix/cache discount
  browserDirect: boolean; // callable from the browser with a user key
  streaming: boolean;
}

export interface AiRequest {
  systemPrompt: string;
  contextBlock: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  userMessage: string;
  // The catalog wire id to call. Optional for back-compat: adapters fall back to
  // their own default model when absent (keeps the mock/legacy call sites simple).
  modelId?: string;
}

export interface AiStreamChunk {
  textDelta: string;
}

export interface AiResult {
  text: string;
  proposedActionJson?: unknown;
  finishReason: 'stop' | 'length' | 'safety' | 'error';
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  complete(
    req: AiRequest,
    key: string,
    signal?: AbortSignal,
  ): AsyncIterable<AiStreamChunk>;
  proposeAction(req: AiRequest, key: string, signal?: AbortSignal): Promise<AiResult>;
  // modelId lets validation hit the exact model the key will be used against.
  validateKey(key: string, modelId?: string, signal?: AbortSignal): Promise<boolean>;
}
