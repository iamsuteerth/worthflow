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

// The set of BYOK providers the app can be built to reach. Widened from the
// original 'gemini' | 'mock' for V4 multi-model support. Which of these actually
// have a registered adapter is a separate question (see provider/index.ts);
// which (provider, model) pairs are *offered* is the model catalog.
export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'openrouter' | 'mock';

// What an adapter can do, so the agent loop and UI can adapt per provider/model.
export interface ProviderCapabilities {
  tools: boolean; // native function/tool calling (Phase B)
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

// ---------------------------------------------------------------------------
// Agent loop (Phase B) — the neutral contract for one model round-trip in a
// tool-use turn. A provider translates these to/from its native tool format.
// Kept separate from the legacy complete()/proposeAction() surface, which stays
// for the flag-off / non-tool path.
// ---------------------------------------------------------------------------

import type { ToolCall, ToolResult, ToolDef } from '@/ai/tools/types';

export type AgentMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolResults: ToolResult[] };

export interface AgentStepRequest {
  systemPrompt: string;
  tools: ToolDef[];
  messages: AgentMessage[];
  modelId?: string;
  // Hint the mock provider uses to drive a deterministic propose vs chat loop.
  // Real providers ignore it (the system prompt biases them instead).
  mode?: 'chat' | 'propose';
}

export interface RunToolStepCallbacks {
  // Streams assistant text as it arrives. Providers that don't stream call this
  // once with the full text. The loop clears the visible text between steps.
  onText(delta: string): void;
}

// The outcome of one model round-trip: any text it produced, and any tool calls
// it wants run. Empty toolCalls ⇒ this is the final answer.
export interface AgentStep {
  text: string;
  toolCalls: ToolCall[];
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
  // Present only on providers with native tool-calling (capabilities.tools).
  runToolStep?(
    req: AgentStepRequest,
    key: string,
    cbs: RunToolStepCallbacks,
    signal?: AbortSignal,
  ): Promise<AgentStep>;
}
