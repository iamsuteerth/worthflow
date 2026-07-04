import { AiError, isAbortError } from '@/ai/provider/types';
import type { AiRequest } from '@/ai/provider/types';

// ---------------------------------------------------------------------------
// Shared plumbing for the thin fetch-based providers (Anthropic / OpenAI /
// OpenRouter). Keeps each adapter to just its wire translation. Gemini keeps its
// own SDK-based module; this mirrors its request-shaping and error mapping so
// behaviour is identical across providers.
// ---------------------------------------------------------------------------

export interface NeutralTurn {
  role: 'user' | 'assistant';
  text: string;
}

// Build the conversation turns from a neutral AiRequest: pin the context block as
// the opening exchange (as Gemini does), then history, then the new user message.
// Adjacent same-role turns are merged so providers that require strict user/assistant
// alternation (Anthropic) never receive two in a row. When there is no context
// (e.g. the summariser call) the priming pair is skipped.
export function buildTurns(req: AiRequest): NeutralTurn[] {
  const turns: NeutralTurn[] = [];
  if (req.contextBlock && req.contextBlock.trim()) {
    turns.push({ role: 'user', text: `[Financial Context]\n${req.contextBlock}` });
    turns.push({ role: 'assistant', text: "I have your financial context. I'm ready to help." });
  }
  for (const h of req.history) turns.push({ role: h.role, text: h.text });
  turns.push({ role: 'user', text: req.userMessage });

  const merged: NeutralTurn[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.text = `${last.text}\n${t.text}`;
    else merged.push({ ...t });
  }
  return merged;
}

// Strip a ```json … ``` fence if a model wraps its JSON despite being asked not to.
export function unfence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1].trim() : trimmed;
}

// Map an HTTP status + (untrusted) error body to an AiError. Crucially, the raw
// message is only *inspected*, never echoed — so an API key or request URL in a
// provider error can't leak into the user-facing text (asserted by tests).
export function translateHttpError(status: number | undefined, rawMessage: string, label: string): AiError {
  const msg = (rawMessage ?? '').toLowerCase();

  if (status === 401 || status === 403) {
    return new AiError('INVALID_KEY', 'Your AI key was rejected. Re-enter it in AI Settings.');
  }
  if (status === 429) {
    const isQuota = msg.includes('quota') || msg.includes('credit') || msg.includes('billing') || msg.includes('insufficient');
    if (isQuota) return new AiError('QUOTA', `Your ${label} quota or credit is used up. Check your ${label} account.`);
    return new AiError('RATE_LIMIT', `${label} is rate-limiting your key — wait a moment and retry.`);
  }
  if (status !== undefined && status >= 500) {
    return new AiError('PROVIDER_DOWN', 'The AI service is having problems right now. Please try again later.');
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return new AiError('NETWORK', "Couldn't reach the AI service. Check your connection and retry.");
  }
  return new AiError('UNKNOWN', 'Something went wrong with the AI. Please retry.');
}

// Translate a thrown fetch/exception. Rethrows AbortError so a user Stop stays a stop.
export function translateFetchError(err: unknown, label: string): AiError {
  if (isAbortError(err)) throw err;
  const e = err as { status?: number; message?: string };
  return translateHttpError(e?.status, e?.message ?? '', label);
}

// Best-effort read of an error response body (never throws).
export async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

// Yield the payloads of `data:` SSE lines from a streaming Response, stopping at
// `[DONE]`. Shared by the OpenAI-compatible and Anthropic stream parsers; each
// adapter interprets the JSON payloads itself.
export async function* sseDataLines(res: Response, signal?: AbortSignal): AsyncIterable<string> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        if (data) yield data;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // reader already released / stream cancelled — nothing to do.
    }
  }
}
