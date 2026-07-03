import { describe, it, expect } from 'vitest';
import { translateError, buildContents } from '@/ai/provider/geminiProvider';
import { isAbortError } from '@/ai/provider/types';
import { estimateTokens, shouldCompact } from '@/ai/chat/tokenBudget';
import { MAX_CONVERSATION_TOKENS } from '@/ai/config';
import type { Message } from '@/ai/chat/conversation.types';

describe('translateError — message-only classification', () => {
  it("maps Safari's 'Load failed' and case variants to NETWORK", () => {
    expect(translateError({ message: 'Load failed' }).kind).toBe('NETWORK');
    expect(translateError({ message: 'FAILED TO FETCH' }).kind).toBe('NETWORK');
  });

  it("maps 429 'limit exceeded' to QUOTA (not RATE_LIMIT)", () => {
    expect(translateError({ status: 429, message: 'Resource limit exceeded for project' }).kind).toBe('QUOTA');
  });

  it('maps a 4xx that is not auth/429 to UNKNOWN, and exactly 500 to PROVIDER_DOWN', () => {
    expect(translateError({ status: 400, message: 'bad request' }).kind).toBe('UNKNOWN');
    expect(translateError({ status: 404 }).kind).toBe('UNKNOWN');
    expect(translateError({ status: 500 }).kind).toBe('PROVIDER_DOWN');
  });

  it('handles a completely empty error object', () => {
    expect(translateError({}).kind).toBe('UNKNOWN');
    expect(translateError(undefined).kind).toBe('UNKNOWN');
  });
});

describe('isAbortError', () => {
  it('matches DOMException aborts and plain named objects, rejects the rest', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });
});

describe('buildContents — structure edges', () => {
  it('empty history yields exactly context, ack, question', () => {
    const contents = buildContents({
      systemPrompt: 's',
      contextBlock: 'CTX',
      history: [],
      userMessage: 'q',
    });
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it('merges a run of same-role turns into one (never drops text)', () => {
    const contents = buildContents({
      systemPrompt: 's',
      contextBlock: 'CTX',
      history: [
        { role: 'assistant', text: 'summary-of-earlier' },
        { role: 'assistant', text: 'a1' },
        { role: 'user', text: 'u1' },
        { role: 'user', text: 'u2' },
      ],
      userMessage: 'q',
    });
    for (let i = 1; i < contents.length; i++) {
      expect(contents[i].role).not.toBe(contents[i - 1].role);
    }
    const all = JSON.stringify(contents);
    for (const t of ['summary-of-earlier', 'a1', 'u1', 'u2', 'q']) {
      expect(all).toContain(t);
    }
  });
});

describe('tokenBudget — boundaries', () => {
  const msgOf = (chars: number): Message => ({
    id: 'x',
    role: 'user',
    text: 'a'.repeat(chars),
    createdAt: 't',
  });

  it('estimateTokens rounds up per message', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('a')).toBe(1);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('shouldCompact triggers strictly above the cap, not at it', () => {
    expect(shouldCompact([msgOf(MAX_CONVERSATION_TOKENS * 4)], undefined)).toBe(false);
    expect(shouldCompact([msgOf(MAX_CONVERSATION_TOKENS * 4 + 1)], undefined)).toBe(true);
  });

  it('counts the stored summary against the budget', () => {
    const summary = 'a'.repeat(400); // 100 tokens
    expect(shouldCompact([msgOf((MAX_CONVERSATION_TOKENS - 100) * 4)], summary)).toBe(false);
    expect(shouldCompact([msgOf((MAX_CONVERSATION_TOKENS - 99) * 4)], summary)).toBe(true);
  });
});
