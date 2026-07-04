import type {
  AIProvider,
  AiRequest,
  AiResult,
  AiStreamChunk,
  AgentStep,
  AgentStepRequest,
  RunToolStepCallbacks,
} from '@/ai/provider/types';

// Pull the forecast's first month out of the serialized context pack so the
// canned action is always inside the window the test/dev plan actually has.
function contextStartMonth(contextBlock: string): string {
  try {
    const pack = JSON.parse(contextBlock) as { meta?: { startMonth?: string } };
    if (pack.meta?.startMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(pack.meta.startMonth)) {
      return pack.meta.startMonth;
    }
  } catch {
    // fall through to default
  }
  return '2025-01';
}

const MOCK_RESPONSES = [
  "Based on your forecast, your net worth is growing steadily over the horizon. Your investment corpus is the biggest driver — the monthly contributions are compounding nicely.",
  "Your lowest cash point is something to watch. Consider whether any large one-off expenses could be deferred or spread across months if that period looks tight.",
  "Your XIRR looks solid relative to typical fixed-deposit rates. The investment accounts are outperforming a conservative benchmark.",
  "The scenario changes you've applied shift the cashflow noticeably. The net worth at the end of the horizon is lower, but the flexibility that spending gives you may be worth the trade-off.",
  "Your FDs mature at useful points in the forecast, providing cash inflows that smooth out some of the expense-heavy months.",
];

let _mockResponseIndex = 0;

function nextMockResponse(): string {
  const r = MOCK_RESPONSES[_mockResponseIndex % MOCK_RESPONSES.length];
  _mockResponseIndex++;
  return r;
}

async function* mockStream(text: string): AsyncIterable<AiStreamChunk> {
  const words = text.split(' ');
  for (const word of words) {
    await new Promise((r) => setTimeout(r, 30));
    yield { textDelta: word + ' ' };
  }
}

const mockProvider: AIProvider = {
  id: 'mock',
  capabilities: { tools: true, promptCaching: false, browserDirect: true, streaming: true },

  async *complete(req: AiRequest, _key: string, signal?: AbortSignal): AsyncIterable<AiStreamChunk> {
    await new Promise((r) => setTimeout(r, 300));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    void req; // used only to satisfy the interface
    yield* mockStream(nextMockResponse());
  },

  // Deterministic tool loop: orient with get_forecast_summary, then either
  // propose a canned (schema-valid, in-window) change (wand) or answer (chat).
  async runToolStep(
    req: AgentStepRequest,
    _key: string,
    cbs: RunToolStepCallbacks,
    signal?: AbortSignal,
  ): Promise<AgentStep> {
    await new Promise((r) => setTimeout(r, 120));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const id = () => crypto.randomUUID();
    const last = req.messages[req.messages.length - 1];

    // Opening step: read the summary first.
    if (!last || last.role !== 'tool') {
      return { text: '', toolCalls: [{ id: id(), name: 'get_forecast_summary', args: {} }] };
    }

    const lastName = last.toolResults[0]?.name;
    let startMonth = '2025-01';
    const summary = last.toolResults.find((r) => r.name === 'get_forecast_summary');
    if (summary) {
      try {
        const parsed = JSON.parse(summary.content) as { startMonth?: string };
        if (parsed.startMonth) startMonth = parsed.startMonth;
      } catch {
        // keep default
      }
    }

    // After orienting, the wand path proposes exactly one canned change.
    if (lastName === 'get_forecast_summary' && req.mode === 'propose') {
      return {
        text: '',
        toolCalls: [
          {
            id: id(),
            name: 'propose_change',
            args: { kind: 'ADD_ONE_OFF_EXPENSE', month: startMonth, amount: 50000, label: 'Suggested expense' },
          },
        ],
      };
    }

    // Final answer (streamed word-by-word for realism).
    const text = req.mode === 'propose'
      ? "Here's a change you can apply based on your forecast."
      : nextMockResponse();
    for (const w of text.split(' ')) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      await new Promise((r) => setTimeout(r, 12));
      cbs.onText(w + ' ');
    }
    return { text, toolCalls: [] };
  },

  async proposeAction(req: AiRequest, _key: string, signal?: AbortSignal): Promise<AiResult> {
    await new Promise((r) => setTimeout(r, 200));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    void _key;
    // Deterministic, schema-valid, in-window canned action so the whole
    // propose→preview→apply flow is testable offline (mock-first philosophy).
    const proposedActionJson = {
      kind: 'ADD_ONE_OFF_EXPENSE',
      month: contextStartMonth(req.contextBlock),
      amount: 50000,
      label: 'Suggested expense',
    };
    return { text: JSON.stringify(proposedActionJson), proposedActionJson, finishReason: 'stop' };
  },

  async validateKey(_key: string, _modelId?: string, signal?: AbortSignal): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    if (signal?.aborted) return false;
    return _key.startsWith('AIza') || _key === 'mock-key';
  },
};

export default mockProvider;
