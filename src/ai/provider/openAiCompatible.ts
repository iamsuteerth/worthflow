import {
  AiError,
  type AIProvider,
  type AiRequest,
  type AiResult,
  type AiStreamChunk,
  type ProviderCapabilities,
  type ProviderId,
  type AgentStep,
  type AgentStepRequest,
  type AgentMessage,
  type RunToolStepCallbacks,
} from '@/ai/provider/types';
import type { ToolCall } from '@/ai/tools/types';
import { buildTurns, unfence, translateHttpError, translateFetchError, safeText, sseDataLines } from '@/ai/provider/providerHttp';
import { extractTextToolCalls } from '@/ai/provider/toolCallText';

// Translate the neutral agent conversation to OpenAI Chat Completions messages.
// Assistant tool calls → `tool_calls`; each tool result → a `role:"tool"` message
// keyed by tool_call_id.
function toOaiMessages(systemPrompt: string, messages: AgentMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [{ role: 'system', content: systemPrompt }];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const msg: Record<string, unknown> = { role: 'assistant', content: m.content || null };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        }));
      }
      out.push(msg);
    } else {
      for (const tr of m.toolResults) out.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
    }
  }
  return out;
}

function parseToolArgs(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? {};
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

// A factory for OpenAI-compatible Chat Completions providers (OpenAI itself and
// OpenRouter, which mirrors the same wire format). Each instance differs only by
// endpoint, extra headers, JSON-mode support, and capability flags.
export interface OpenAiCompatibleConfig {
  id: ProviderId;
  label: string;
  endpoint: string;
  capabilities: ProviderCapabilities;
  defaultModelId: () => string;
  // Bearer token is added automatically; this adds any provider-specific extras.
  extraHeaders?: () => Record<string, string>;
  // response_format:{type:'json_object'} — supported by OpenAI; off for OpenRouter
  // (support varies by underlying model, and the unfence+parse fallback covers it).
  supportsJsonMode: boolean;
}

export function createOpenAiCompatibleProvider(cfg: OpenAiCompatibleConfig): AIProvider {
  function headers(key: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      ...(cfg.extraHeaders?.() ?? {}),
    };
  }

  function messages(req: AiRequest): Array<{ role: string; content: string }> {
    const msgs: Array<{ role: string; content: string }> = [{ role: 'system', content: req.systemPrompt }];
    for (const t of buildTurns(req)) msgs.push({ role: t.role, content: t.text });
    return msgs;
  }

  return {
    id: cfg.id,
    capabilities: cfg.capabilities,

    async *complete(req: AiRequest, key: string, signal?: AbortSignal): AsyncIterable<AiStreamChunk> {
      let res: Response;
      try {
        res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: headers(key),
          body: JSON.stringify({ model: req.modelId ?? cfg.defaultModelId(), messages: messages(req), stream: true }),
          signal,
        });
      } catch (err) {
        throw translateFetchError(err, cfg.label);
      }
      if (!res.ok) throw translateHttpError(res.status, await safeText(res), cfg.label);

      for await (const data of sseDataLines(res, signal)) {
        let json: { choices?: Array<{ delta?: { content?: string } }> };
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { textDelta: delta };
      }
    },

    async proposeAction(req: AiRequest, key: string, signal?: AbortSignal): Promise<AiResult> {
      let res: Response;
      try {
        res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: headers(key),
          body: JSON.stringify({
            model: req.modelId ?? cfg.defaultModelId(),
            messages: messages(req),
            ...(cfg.supportsJsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal,
        });
      } catch (err) {
        throw translateFetchError(err, cfg.label);
      }
      if (!res.ok) throw translateHttpError(res.status, await safeText(res), cfg.label);

      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content ?? '';
      if (!raw.trim()) {
        throw new AiError('MALFORMED_RESPONSE', "I didn't get a complete suggestion — please retry.");
      }
      try {
        return { text: raw, proposedActionJson: JSON.parse(unfence(raw)), finishReason: 'stop' };
      } catch {
        return { text: raw, proposedActionJson: undefined, finishReason: 'error' };
      }
    },

    // Non-streaming per tool step (robust across the many OpenRouter models); the
    // final text answer is emitted at once via onText. Streaming tool-call assembly
    // can be layered on later without changing this contract.
    async runToolStep(
      req: AgentStepRequest,
      key: string,
      cbs: RunToolStepCallbacks,
      signal?: AbortSignal,
    ): Promise<AgentStep> {
      const body: Record<string, unknown> = {
        model: req.modelId ?? cfg.defaultModelId(),
        messages: toOaiMessages(req.systemPrompt, req.messages),
      };
      if (req.tools.length) {
        body.tools = req.tools.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        }));
        body.tool_choice = 'auto';
      }

      let res: Response;
      try {
        res = await fetch(cfg.endpoint, { method: 'POST', headers: headers(key), body: JSON.stringify(body), signal });
      } catch (err) {
        throw translateFetchError(err, cfg.label);
      }
      if (!res.ok) throw translateHttpError(res.status, await safeText(res), cfg.label);

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } }>;
      };
      const message = json.choices?.[0]?.message ?? {};
      const text = message.content ?? '';
      const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((tc) => ({
        id: tc.id ?? crypto.randomUUID(),
        name: tc.function?.name ?? '',
        args: parseToolArgs(tc.function?.arguments),
      }));

      // Fallback: some open models (e.g. NVIDIA Nemotron) emit a tool call as TEXT
      // in the Hermes/pythonic format instead of via native `tool_calls`. Recover
      // it so the call runs the normal validated path instead of leaking raw markup
      // to the user. Gated on the turn's known tool names; on the overflow step
      // (req.tools empty) nothing is recovered, so a forced text answer stands.
      let surfacedText = text;
      let calls = toolCalls;
      if (calls.length === 0 && text && req.tools.length) {
        const extracted = extractTextToolCalls(text, new Set(req.tools.map((t) => t.name)));
        if (extracted.toolCalls.length) {
          calls = extracted.toolCalls;
          surfacedText = extracted.cleanedText;
        }
      }

      if (surfacedText) cbs.onText(surfacedText);
      return { text: surfacedText, toolCalls: calls };
    },

    async validateKey(key: string, modelId?: string, signal?: AbortSignal): Promise<boolean> {
      try {
        const res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: headers(key),
          body: JSON.stringify({
            model: modelId ?? cfg.defaultModelId(),
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
          signal,
        });
        if (res.ok) return true;
        if (res.status === 401 || res.status === 403) return false;
        throw translateHttpError(res.status, await safeText(res), cfg.label);
      } catch (err) {
        if (signal?.aborted) return false;
        if (err instanceof AiError) throw err;
        throw translateFetchError(err, cfg.label);
      }
    },
  };
}
