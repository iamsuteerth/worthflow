import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';
import { AI_MODEL_ID } from '@/ai/config';
import { AiError, type AIProvider, type AiRequest, type AiStreamChunk } from '@/ai/provider/types';

export function translateError(err: unknown): AiError {
  const e = err as { status?: number; message?: string; name?: string };
  const status = e?.status;
  const msg = e?.message ?? 'Unknown error';

  if (e?.name === 'AbortError') throw err;

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
  const contents: Content[] = [];

  // Pin the context block as the first exchange so it's always in scope.
  // Gemini requires alternating user/model turns.
  contents.push({ role: 'user', parts: [{ text: `[Financial Context]\n${req.contextBlock}` }] });
  contents.push({
    role: 'model',
    parts: [{ text: "I have your financial context. I'm ready to help." }],
  });

  for (const h of req.history) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    });
  }

  contents.push({ role: 'user', parts: [{ text: req.userMessage }] });
  return contents;
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
      if ((err as { name?: string })?.name === 'AbortError') throw err;
      throw translateError(err);
    }
  },

  async validateKey(key: string, signal?: AbortSignal): Promise<boolean> {
    const ai = new GoogleGenAI({ apiKey: key });
    try {
      await ai.models.generateContent({
        model: AI_MODEL_ID,
        contents: 'ping',
        config: { maxOutputTokens: 1 },
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
