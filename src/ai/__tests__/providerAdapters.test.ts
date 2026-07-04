import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildTurns, unfence, translateHttpError } from '@/ai/provider/providerHttp';
import openrouterProvider from '@/ai/provider/openrouterProvider';
import type { AiRequest } from '@/ai/provider/types';

const req = (over: Partial<AiRequest> = {}): AiRequest => ({
  systemPrompt: 'sys',
  contextBlock: 'CTX',
  history: [],
  userMessage: 'q',
  ...over,
});

// A streaming Response whose body emits the given SSE text chunks.
function sseResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

async function collect(iter: AsyncIterable<{ textDelta: string }>): Promise<string> {
  let acc = '';
  for await (const c of iter) acc += c.textDelta;
  return acc;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

describe('providerHttp.buildTurns', () => {
  it('pins context as the opening user/assistant pair, then the user message', () => {
    const turns = buildTurns(req({ history: [] }));
    expect(turns[0]).toEqual({ role: 'user', text: '[Financial Context]\nCTX' });
    expect(turns[1].role).toBe('assistant');
    expect(turns[turns.length - 1]).toEqual({ role: 'user', text: 'q' });
  });

  it('never emits two consecutive same-role turns', () => {
    const turns = buildTurns(req({ history: [{ role: 'assistant', text: 'a1' }, { role: 'user', text: 'u1' }] }));
    for (let i = 1; i < turns.length; i++) expect(turns[i].role).not.toBe(turns[i - 1].role);
  });

  it('skips the context priming when there is no context (summariser calls)', () => {
    const turns = buildTurns(req({ contextBlock: '', history: [] }));
    expect(turns).toEqual([{ role: 'user', text: 'q' }]);
  });
});

describe('providerHttp.unfence', () => {
  it('strips a ```json fence', () => {
    expect(unfence('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(unfence('{"a":1}')).toBe('{"a":1}');
  });
});

describe('providerHttp.translateHttpError', () => {
  it('classifies statuses', () => {
    expect(translateHttpError(401, '', 'X').kind).toBe('INVALID_KEY');
    expect(translateHttpError(429, 'quota exceeded', 'X').kind).toBe('QUOTA');
    expect(translateHttpError(429, 'slow down', 'X').kind).toBe('RATE_LIMIT');
    expect(translateHttpError(503, '', 'X').kind).toBe('PROVIDER_DOWN');
    expect(translateHttpError(400, 'Failed to fetch', 'X').kind).toBe('NETWORK');
    expect(translateHttpError(400, 'weird', 'X').kind).toBe('UNKNOWN');
  });

  it('never echoes a secret-bearing error body into the user message', () => {
    const out = translateHttpError(400, 'auth failed for key sk-ant-SECRET_123 at https://api.anthropic.com', 'Anthropic');
    expect(out.message).not.toContain('sk-ant-SECRET_123');
    expect(out.message).not.toContain('api.anthropic.com');
  });
});

// ---------------------------------------------------------------------------
// Adapter behaviour (mocked fetch)
// ---------------------------------------------------------------------------

describe('openai-compatible providers', () => {
  for (const [name, provider, expectedId] of [
    ['openrouter', openrouterProvider, 'openrouter'],
  ] as const) {
    it(`${name}: streams text from choices[].delta.content`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () =>
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      ));
      expect(provider.id).toBe(expectedId);
      expect(await collect(provider.complete(req(), 'k'))).toBe('Hello');
    });

    it(`${name}: parses a JSON action from proposeAction`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"kind":"ADD_BONUS_INCOME","month":"2025-02","amount":500,"description":"y"}' } }] }), { status: 200 }),
      ));
      const r = await provider.proposeAction(req(), 'k');
      expect((r.proposedActionJson as { kind: string }).kind).toBe('ADD_BONUS_INCOME');
    });

    it(`${name}: validateKey true on 200, false on 403`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
      expect(await provider.validateKey('k')).toBe(true);
      vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
      expect(await provider.validateKey('k')).toBe(false);
    });
  }
});

describe('openrouter runToolStep (agent loop)', () => {
  it('parses tool_calls (name + JSON arguments) from the response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: null, tool_calls: [{ id: 'c1', function: { name: 'get_month', arguments: '{"month":"2025-03"}' } }] } }],
      }), { status: 200 }),
    ));
    const step = await openrouterProvider.runToolStep!(
      { systemPrompt: 's', tools: [], messages: [{ role: 'user', content: 'q' }] },
      'k',
      { onText: () => {} },
    );
    expect(step.toolCalls).toHaveLength(1);
    expect(step.toolCalls[0].name).toBe('get_month');
    expect(step.toolCalls[0].args).toEqual({ month: '2025-03' });
  });

  it('returns final text (emitted via onText) with no tool calls', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'Here is the answer.' } }] }), { status: 200 }),
    ));
    const onText = vi.fn();
    const step = await openrouterProvider.runToolStep!(
      { systemPrompt: 's', tools: [], messages: [{ role: 'user', content: 'q' }] },
      'k',
      { onText },
    );
    expect(step.text).toBe('Here is the answer.');
    expect(step.toolCalls).toHaveLength(0);
    expect(onText).toHaveBeenCalledWith('Here is the answer.');
  });
});
