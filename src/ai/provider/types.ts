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
  // Phase 2: request a structured ProposedAction (JSON) instead of free text.
  // Set only on the explicit "Suggest a change" path; chat keeps streaming text.
  expectAction?: boolean;
}

export interface AiStreamChunk {
  textDelta: string;
}

// Phase 2: the structured result of a `proposeAction` call. `proposedActionJson`
// is RAW, untrusted model output — it must pass through Zod (validateAction)
// before anything is rendered or applied.
export interface AiResult {
  text: string;
  proposedActionJson?: unknown;
  finishReason: 'stop' | 'length' | 'safety' | 'error';
}

export interface AIProvider {
  readonly id: 'gemini' | 'mock';
  complete(
    req: AiRequest,
    key: string,
    signal?: AbortSignal,
  ): AsyncIterable<AiStreamChunk>;
  // Phase 2: one-shot structured request. Returns raw JSON for Zod validation.
  proposeAction(req: AiRequest, key: string, signal?: AbortSignal): Promise<AiResult>;
  validateKey(key: string, signal?: AbortSignal): Promise<boolean>;
}
