import { describe, it, expect } from 'vitest';
import {
  compactConversation,
  buildHistoryForRequest,
  pruneHistoryTokens,
} from '@/ai/chat/compaction';
import type { Conversation, Message } from '@/ai/chat/conversation.types';
import type { AIProvider } from '@/ai/provider/types';

const summarizer: AIProvider = {
  id: 'mock',
  capabilities: { promptCaching: false, browserDirect: true, streaming: true },
  async *complete() {
    yield { textDelta: 'Concise faithful summary.' };
  },
  async proposeAction() {
    return { text: '', finishReason: 'stop' };
  },
  async validateKey() {
    return true;
  },
};

const failing: AIProvider = {
  id: 'mock',
  capabilities: { promptCaching: false, browserDirect: true, streaming: true },
  // An async iterable that rejects as soon as it's iterated (simulates a failed
  // summarisation call) without being a yield-less generator.
  complete: () => ({
    [Symbol.asyncIterator]() {
      return { next: () => Promise.reject(new Error('boom')) };
    },
  }),
  async proposeAction() {
    return { text: '', finishReason: 'stop' };
  },
  async validateKey() {
    return true;
  },
};

function conv(messages: Message[], summary?: string): Conversation {
  return { v: 1, messages, summary, contextEpochId: 'e', startedAt: 't', updatedAt: 't' };
}

function makeMessages(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: `message number ${i}`,
    createdAt: 't',
  }));
}

describe('compactConversation', () => {
  it('summarises older turns and keeps the recent tail verbatim', async () => {
    const out = await compactConversation(conv(makeMessages(16)), summarizer, 'key');
    expect(out.messages.length).toBe(12); // KEEP_TAIL_MESSAGES
    expect(out.messages[0].id).toBe('4'); // 16 - 12 dropped
    expect(out.summary).toBe('Concise faithful summary.');
  });

  it('is a no-op when at or under the tail size', async () => {
    const small = conv(makeMessages(5));
    expect(await compactConversation(small, summarizer, 'key')).toBe(small);
  });

  it('replaces (not appends) a prior summary to bound growth', async () => {
    const out = await compactConversation(conv(makeMessages(16), 'old summary here'), summarizer, 'key');
    expect(out.summary).toBe('Concise faithful summary.');
  });

  it('falls back to dropping turns without a summary when the call fails', async () => {
    const out = await compactConversation(conv(makeMessages(16)), failing, 'key');
    expect(out.messages.length).toBe(12);
    expect(out.summary).toBeUndefined();
  });
});

describe('buildHistoryForRequest', () => {
  it('prepends the summary and skips streaming / errored messages', () => {
    const c = conv(
      [
        { id: '1', role: 'user', text: 'hi', createdAt: 't' },
        { id: '2', role: 'assistant', text: 'hello', createdAt: 't' },
        { id: '3', role: 'assistant', text: '', createdAt: 't', streaming: true },
        { id: '4', role: 'assistant', text: 'oops', createdAt: 't', error: { kind: 'UNKNOWN', message: 'x' } },
      ],
      'prev summary',
    );
    const h = buildHistoryForRequest(c);
    expect(h[0]).toEqual({ role: 'assistant', text: '[Earlier conversation summary: prev summary]' });
    expect(h).toContainEqual({ role: 'user', text: 'hi' });
    expect(h).toContainEqual({ role: 'assistant', text: 'hello' });
    expect(h.some((x) => x.text === '' || x.text === 'oops')).toBe(false);
  });
});

describe('pruneHistoryTokens', () => {
  it('keeps the most recent messages within the token budget', () => {
    const long = Array.from({ length: 50 }, () => ({ role: 'user' as const, text: 'x'.repeat(40) }));
    const pruned = pruneHistoryTokens(long, 50);
    expect(pruned.length).toBeGreaterThan(0);
    expect(pruned.length).toBeLessThan(50);
    expect(pruned[pruned.length - 1]).toBe(long[long.length - 1]); // tail preserved
  });

  it('keeps at least one message even if it exceeds the budget', () => {
    const one = [{ role: 'user' as const, text: 'x'.repeat(10_000) }];
    expect(pruneHistoryTokens(one, 10).length).toBe(1);
  });
});
