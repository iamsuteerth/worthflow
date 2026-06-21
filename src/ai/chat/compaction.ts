import { KEEP_TAIL_MESSAGES, SUMMARY_SYSTEM_PROMPT } from '@/ai/config';
import { estimateTokens } from '@/ai/chat/tokenBudget';
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
    const prior = conversation.summary
      ? `Earlier summary so far:\n${conversation.summary}\n\nNew turns to fold in:\n`
      : 'Conversation turns to summarise:\n';
    const prompt = `${prior}${turnText}`;

    let accumulated = '';
    for await (const chunk of provider.complete(
      {
        systemPrompt: SUMMARY_SYSTEM_PROMPT,
        contextBlock: '',
        history: [],
        userMessage: prompt,
      },
      key,
    )) {
      accumulated += chunk.textDelta;
    }

    // The summary call returns a single consolidated summary (prior + new turns),
    // so it replaces rather than appends — prevents unbounded summary growth.
    newSummary = accumulated.trim();
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

