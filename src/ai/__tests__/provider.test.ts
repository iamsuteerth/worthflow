import { describe, it, expect } from 'vitest';
import { translateError, buildContents } from '@/ai/provider/geminiProvider';
import mockProvider from '@/ai/provider/mockProvider';
import { proposedActionSchema } from '@/ai/actions/actionSchema';

describe('translateError — classification', () => {
  it('maps auth failures to INVALID_KEY', () => {
    expect(translateError({ status: 401 }).kind).toBe('INVALID_KEY');
    expect(translateError({ status: 403 }).kind).toBe('INVALID_KEY');
  });

  it('distinguishes quota from rate-limit on 429', () => {
    expect(translateError({ status: 429, message: 'quota exceeded' }).kind).toBe('QUOTA');
    expect(translateError({ status: 429, message: 'too many requests' }).kind).toBe('RATE_LIMIT');
  });

  it('maps 5xx to PROVIDER_DOWN and fetch failures to NETWORK', () => {
    expect(translateError({ status: 503 }).kind).toBe('PROVIDER_DOWN');
    expect(translateError({ message: 'Failed to fetch' }).kind).toBe('NETWORK');
    expect(translateError({ message: 'NetworkError when attempting to fetch' }).kind).toBe('NETWORK');
  });

  it('falls back to UNKNOWN', () => {
    expect(translateError({ message: 'totally weird' }).kind).toBe('UNKNOWN');
  });

  it('rethrows AbortError so the caller can treat it as a user stop', () => {
    expect(() => translateError({ name: 'AbortError' })).toThrow();
  });
});

describe('translateError — secret redaction', () => {
  it('never echoes an API key or request URL into the user message', () => {
    const leaky = {
      status: 400,
      message:
        'request to https://generativelanguage.googleapis.com/v1/models:generateContent?key=AIzaSECRET_TOKEN_123 failed',
    };
    const out = translateError(leaky);
    expect(out.message).not.toContain('AIzaSECRET_TOKEN_123');
    expect(out.message).not.toContain('key=');
    expect(out.message).not.toContain('googleapis.com');
  });
});

describe('buildContents', () => {
  it('pins the context first, then alternates history, then the new turn', () => {
    const contents = buildContents({
      systemPrompt: 'sys',
      contextBlock: 'CTX_JSON_BLOCK',
      history: [
        { role: 'user', text: 'q1' },
        { role: 'assistant', text: 'a1' },
      ],
      userMessage: 'the new question',
    });
    expect(contents[0].role).toBe('user');
    expect(JSON.stringify(contents[0])).toContain('CTX_JSON_BLOCK');
    expect(contents[1].role).toBe('model'); // the priming ack
    // assistant history is mapped to 'model'
    expect(contents.some((c) => c.role === 'model' && JSON.stringify(c).includes('a1'))).toBe(true);
    const last = contents[contents.length - 1];
    expect(last.role).toBe('user');
    expect(JSON.stringify(last)).toContain('the new question');
  });
});

describe('mockProvider', () => {
  it('validates AIza-prefixed keys and rejects others', async () => {
    expect(await mockProvider.validateKey('AIzaABC')).toBe(true);
    expect(await mockProvider.validateKey('not-a-key')).toBe(false);
  });

  it('streams non-empty text', async () => {
    let acc = '';
    for await (const c of mockProvider.complete(
      { systemPrompt: '', contextBlock: '', history: [], userMessage: 'hi' },
      'mock-key',
    )) {
      acc += c.textDelta;
    }
    expect(acc.trim().length).toBeGreaterThan(0);
  });

  it('honours an aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      (async () => {
        for await (const _ of mockProvider.complete(
          { systemPrompt: '', contextBlock: '', history: [], userMessage: 'hi' },
          'mock-key',
          ac.signal,
        )) {
          void _;
        }
      })(),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('mockProvider.proposeAction (Phase 2)', () => {
  it('returns a schema-valid canned action inside the context window', async () => {
    const result = await mockProvider.proposeAction(
      {
        systemPrompt: '',
        contextBlock: JSON.stringify({ meta: { startMonth: '2027-05' } }),
        history: [],
        userMessage: 'add an expense',
        expectAction: true,
      },
      'mock-key',
    );
    expect(proposedActionSchema.safeParse(result.proposedActionJson).success).toBe(true);
    expect((result.proposedActionJson as { month: string }).month).toBe('2027-05');
  });

  it('honours an aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      mockProvider.proposeAction(
        { systemPrompt: '', contextBlock: '', history: [], userMessage: 'x', expectAction: true },
        'mock-key',
        ac.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
