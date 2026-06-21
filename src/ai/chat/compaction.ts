import { KEEP_TAIL_MESSAGES } from '@/ai/config';
import { estimateTokens } from '@/ai/chat/tokenBudget';
import { SYSTEM_PROMPT } from '@/ai/config';
import type { Conversation } from '@/ai/chat/conversation.types';
import type { AIProvider } from '@/ai/provider/types';

/**
 * Compacts the conversation: summarizes the older turns that fall outside
 * the KEEP_TAIL_MESSAGES window, merges the summary, and keeps the tail verbatim.
 *
 * Returns the compacted Conversation. If the summary call fails, we drop the
 * old turns without a summary (never block; never lose the recent tail).
 */
export async function compactConversation(
  conversation: Conversation,
  provider: AIProvider,
  key: string,
): Promise<Conversation> {
  const { messages } = conversation;
  if (messages.length <= KEEP_TAIL_MESSAGES) return conversation;

  const toSummarize = messages.slice(0, messages.length - KEEP_TAIL_MESSAGES);
  const tail = messages.slice(messages.length - KEEP_TAIL_MESSAGES);

  let newSummary: string;

  try {
    const turnText = toSummarize
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n');
    const prompt = `Summarize the following conversation turns in 2-3 sentences, preserving any key financial decisions or insights mentioned:\n\n${turnText}`;
    if (conversation.summary) {
      // Merge with existing summary
    }

    let accumulated = '';
    for await (const chunk of provider.complete(
      {
        systemPrompt: SYSTEM_PROMPT,
        contextBlock: '',
        history: [],
        userMessage: prompt,
      },
      key,
    )) {
      accumulated += chunk.textDelta;
    }

    const prevSummary = conversation.summary ? conversation.summary + ' ' : '';
    newSummary = prevSummary + accumulated.trim();
  } catch {
    // Compaction summary call failed — drop turns without summary, never block.
    newSummary = conversation.summary ?? '';
  }

  return {
    ...conversation,
    messages: tail,
    summary: newSummary || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function compactedTokenEstimate(conversation: Conversation): number {
  const msgTokens = conversation.messages.reduce((s, m) => s + estimateTokens(m.text), 0);
  const summaryTokens = conversation.summary ? estimateTokens(conversation.summary) : 0;
  return msgTokens + summaryTokens;
}

export function buildHistoryForRequest(
  conversation: Conversation,
): Array<{ role: 'user' | 'assistant'; text: string }> {
  const history: Array<{ role: 'user' | 'assistant'; text: string }> = [];

  if (conversation.summary) {
    history.push({
      role: 'assistant',
      text: `[Earlier conversation summary: ${conversation.summary}]`,
    });
  }

  for (const m of conversation.messages) {
    if (m.streaming || m.error) continue; // skip incomplete/failed messages
    history.push({ role: m.role, text: m.text });
  }

  return history;
}

// Keep only messages within the last MAX_HISTORY_TOKENS worth of tokens.
export function pruneHistoryTokens(
  history: Array<{ role: 'user' | 'assistant'; text: string }>,
  maxTokens: number,
): Array<{ role: 'user' | 'assistant'; text: string }> {
  let tokens = 0;
  const result: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const t = estimateTokens(history[i].text);
    if (tokens + t > maxTokens && result.length > 0) break;
    result.unshift(history[i]);
    tokens += t;
  }
  return result;
}

