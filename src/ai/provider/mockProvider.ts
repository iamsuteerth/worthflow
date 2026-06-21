import type { AIProvider, AiRequest, AiStreamChunk } from '@/ai/provider/types';

const MOCK_RESPONSES = [
  "Based on your forecast, your net worth is growing steadily over the horizon. Your investment corpus is the biggest driver — the monthly contributions are compounding nicely.",
  "Your lowest cash point is something to watch. Consider whether any large one-off expenses could be deferred or spread across months if that period looks tight.",
  "Your XIRR looks solid relative to typical fixed-deposit rates. The investment accounts are outperforming a conservative benchmark.",
  "The scenario changes you've applied shift the cashflow noticeably. The net worth at the end of the horizon is lower, but the flexibility that spending gives you may be worth the trade-off.",
  "Your FDs mature at useful points in the forecast, providing cash inflows that smooth out some of the expense-heavy months.",
];

let _mockResponseIndex = 0;

async function* mockStream(text: string): AsyncIterable<AiStreamChunk> {
  const words = text.split(' ');
  for (const word of words) {
    await new Promise((r) => setTimeout(r, 30));
    yield { textDelta: word + ' ' };
  }
}

const mockProvider: AIProvider = {
  id: 'mock',

  async *complete(req: AiRequest, _key: string, signal?: AbortSignal): AsyncIterable<AiStreamChunk> {
    await new Promise((r) => setTimeout(r, 300));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const response = MOCK_RESPONSES[_mockResponseIndex % MOCK_RESPONSES.length];
    _mockResponseIndex++;
    void req; // used only to satisfy the interface
    yield* mockStream(response);
  },

  async validateKey(_key: string, signal?: AbortSignal): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    if (signal?.aborted) return false;
    return _key.startsWith('AIza') || _key === 'mock-key';
  },
};

export default mockProvider;
