import type { Message } from '@/ai/chat/conversation.types';

import { describe, it, expect } from 'vitest';

import { estimateTokens, estimateMessagesTokens, shouldCompact } from '@/ai/chat/tokenBudget';

const msg = (text: string): Message => ({ id: 'x', role: 'user', text, createdAt: 't' });

describe('tokenBudget', () => {
  it('estimates ~1 token per 4 characters', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(401))).toBe(101);
  });

  it('sums message tokens', () => {
    expect(estimateMessagesTokens([msg('abcd'), msg('abcd')])).toBe(2);
  });

  it('flags compaction only past MAX_CONVERSATION_TOKENS', () => {
    expect(shouldCompact([msg('short')], undefined)).toBe(false);
    // 50k chars ≈ 12.5k tokens > 12k cap
    expect(shouldCompact([msg('a'.repeat(50_000))], undefined)).toBe(true);
  });

  it('counts the summary toward the budget', () => {
    expect(shouldCompact([msg('a'.repeat(40_000))], 'b'.repeat(40_000))).toBe(true);
  });
});
