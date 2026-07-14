import type { Message } from '@/ai/chat/conversation.types';

import { MAX_CONVERSATION_TOKENS, MAX_HISTORY_TOKENS } from '@/ai/config';

export { MAX_HISTORY_TOKENS };

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
