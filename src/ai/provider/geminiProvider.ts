import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';
import { AI_MODEL_ID } from '@/ai/config';
import { AiError, isAbortError, type AIProvider, type AiRequest, type AiResult, type AiStreamChunk } from '@/ai/provider/types';

// Strip a ```json … ``` fence if the model wraps its JSON despite the
// application/json response mode (occasionally happens).
function unfence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1].trim() : trimmed;
}

export function translateError(err: unknown): AiError {
  const e = err as { status?: number; message?: string; name?: string };
  const status = e?.status;
  const msg = e?.message ?? 'Unknown error';

  if (isAbortError(err)) throw err;

  if (status === 401 || status === 403) {
    return new AiError('INVALID_KEY', 'Your AI key was rejected. Re-enter it in AI Settings.');
  }
  if (status === 429) {
    const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit exceeded');
    if (isQuota) return new AiError('QUOTA', 'Your Gemini quota is used up. Try later or check your Google AI usage.');
    return new AiError('RATE_LIMIT', 'Gemini is rate-limiting your key — wait a moment and retry.');
  }
  if (status !== undefined && status >= 500) {
    return new AiError('PROVIDER_DOWN', 'The AI service is having problems right now. Please try again later.');
  }

  const msgLower = msg.toLowerCase();
  if (
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('load failed')
  ) {
    return new AiError('NETWORK', "Couldn't reach the AI service. Check your connection and retry.");
  }

  return new AiError('UNKNOWN', 'Something went wrong with the AI. Please retry.');
}

export function buildContents(req: AiRequest): Content[] {
  // Pin the context block as the first exchange so it's always in scope.
  const turns: Array<{ role: 'user' | 'model'; text: string }> = [];
  turns.push({ role: 'user', text: `[Financial Context]\n${req.contextBlock}` });
  turns.push({ role: 'model', text: "I have your financial context. I'm ready to help." });

  for (const h of req.history) {
    turns.push({ role: h.role === 'assistant' ? 'model' : 'user', text: h.text });
  }

  turns.push({ role: 'user', text: req.userMessage });

  // Gemini requires strictly alternating user/model turns. Collapse any adjacent
  // same-role turns so a caller bug can never send two user (or model) turns in a
  // row (which Gemini rejects / mishandles).
  const merged: Array<{ role: 'user' | 'model'; text: string }> = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) {
      last.text = `${last.text}\n${t.text}`;
    } else {
      merged.push({ ...t });
    }
  }

  return merged.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

const geminiProvider: AIProvider = {
  id: 'gemini',

  async *complete(
    req: AiRequest,
    key: string,
    signal?: AbortSignal,
  ): AsyncIterable<AiStreamChunk> {
    const ai = new GoogleGenAI({ apiKey: key });
    let stream: AsyncIterable<{ text?: string }>;
    try {
      stream = await ai.models.generateContentStream({
        model: AI_MODEL_ID,
        // abortSignal lets the underlying fetch be cancelled (Stop button / panel close).
        config: { systemInstruction: req.systemPrompt, abortSignal: signal },
        contents: buildContents(req),
      });
    } catch (err) {
      throw translateError(err);
    }

    try {
      for await (const chunk of stream) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const text = chunk.text;
        if (text) yield { textDelta: text };
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw translateError(err);
    }
  },

  async proposeAction(req: AiRequest, key: string, signal?: AbortSignal): Promise<AiResult> {
    const ai = new GoogleGenAI({ apiKey: key });
    let raw: string;
    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL_ID,
        // JSON mode: the model returns a single ProposedAction object. We never
        // trust it — it goes straight into Zod (validateAction) downstream.
        config: {
          systemInstruction: req.systemPrompt,
          responseMimeType: 'application/json',
          abortSignal: signal,
        },
        contents: buildContents(req),
      });
      raw = response.text ?? '';
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw translateError(err);
    }

    if (!raw.trim()) {
      throw new AiError('MALFORMED_RESPONSE', "I didn't get a complete suggestion — please retry.");
    }

    try {
      const proposedActionJson = JSON.parse(unfence(raw));
      return { text: raw, proposedActionJson, finishReason: 'stop' };
    } catch {
      // Non-JSON / unparseable → leave the action undefined so the caller maps
      // it to INVALID_ACTION and renders nothing.
      return { text: raw, proposedActionJson: undefined, finishReason: 'error' };
    }
  },

  async validateKey(key: string, signal?: AbortSignal): Promise<boolean> {
    const ai = new GoogleGenAI({ apiKey: key });
    try {
      await ai.models.generateContent({
        model: AI_MODEL_ID,
        contents: 'ping',
        config: { maxOutputTokens: 1, abortSignal: signal },
      });
      return true;
    } catch (err) {
      if (signal?.aborted) return false;
      const e = err as { status?: number };
      if (e?.status === 401 || e?.status === 403) return false;
      // Network errors, 5xx, etc. — don't treat as invalid key
      throw translateError(err);
    }
  },
};

export default geminiProvider;
