import { MAX_CONVERSATION_TOKENS, MAX_HISTORY_TOKENS } from '@/ai/config';
export { MAX_HISTORY_TOKENS };
import type { Message } from '@/ai/chat/conversation.types';

/** Cheap heuristic: 1 token ≈ 4 characters. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.text), 0);
}

/** True when the conversation is large enough to warrant compaction. */
export function shouldCompact(messages: Message[], summary: string | undefined): boolean {
  const total = estimateMessagesTokens(messages) + (summary ? estimateTokens(summary) : 0);
  return total > MAX_CONVERSATION_TOKENS;
}

/**
 * Returns the slice of messages to send as history for the next API call.
 * Keeps the tail within MAX_HISTORY_TOKENS to avoid blowing the context window.
 */
export function trimHistoryForRequest(messages: Message[]): Message[] {
  // Walk backwards collecting messages until we'd exceed the token budget.
  let tokens = 0;
  const result: Message[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = estimateTokens(messages[i].text);
    if (tokens + t > MAX_HISTORY_TOKENS && result.length > 0) break;
    result.unshift(messages[i]);
    tokens += t;
  }
  return result;
}
