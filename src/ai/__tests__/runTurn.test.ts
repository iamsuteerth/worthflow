import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlannerStore } from '@/store/plannerStore';
import { baseConfig, account, m } from '@/engine/__tests__/factories';
import { runTurn } from '@/ai/agent/runTurn';
import mockProvider from '@/ai/provider/mockProvider';
import { ALL_TOOL_DEFS } from '@/ai/tools/defs';
import type { AIProvider, AgentMessage } from '@/ai/provider/types';

const cfg = baseConfig({
  forecast: { startMonth: m('2025-01'), totalMonths: 12 },
  investments: {
    accounts: [account({ id: 'acc-1', name: 'Mutual Fund', openingBalance: 100_000, defaultMonthlyContribution: 5_000 })],
    amountOverrides: [],
    returnOverrides: [],
  },
});

const base = (mode: 'chat' | 'propose', messages: AgentMessage[]) => ({
  provider: mockProvider,
  key: 'mock-key',
  modelId: 'gemini-2.5-flash',
  systemPrompt: 'sys',
  tools: ALL_TOOL_DEFS,
  messages,
  mode,
});

const noopCbs = () => ({ onText: vi.fn(), onReset: vi.fn() });

beforeEach(() => {
  usePlannerStore.setState({
    baseConfig: cfg,
    config: cfg,
    overrides: {},
    baselineAccountIds: ['acc-1'],
    history: { past: [], future: [] },
  });
});

describe('runTurn — chat mode', () => {
  it('orients with a tool call then answers, tracing the tools used', async () => {
    const cbs = noopCbs();
    const res = await runTurn(base('chat', [{ role: 'user', content: 'How is my forecast?' }]), cbs);
    expect(res.text.trim().length).toBeGreaterThan(0);
    expect(res.toolTrace.some((t) => t.tool === 'get_forecast_summary')).toBe(true);
    expect(res.proposedAction).toBeUndefined();
    // Streamed the final answer and reset between steps.
    expect(cbs.onText).toHaveBeenCalled();
    expect(cbs.onReset).toHaveBeenCalled();
  });
});

describe('runTurn — propose mode', () => {
  it('surfaces a validated, confirmable proposed action without applying', async () => {
    const res = await runTurn(base('propose', [{ role: 'user', content: 'Suggest a change' }]), noopCbs());
    expect(res.proposedAction).toBeDefined();
    expect(res.proposedAction?.kind).toBe('ADD_ONE_OFF_EXPENSE');
    expect(res.toolTrace.some((t) => t.tool === 'propose_change')).toBe(true);
    // The live plan is never mutated by a proposal.
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
  });
});

describe('runTurn — abort', () => {
  it('rejects with AbortError when the signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      runTurn(base('chat', [{ role: 'user', content: 'hi' }]), noopCbs(), ac.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('runTurn — iteration cap', () => {
  it('terminates and returns an answer even if the model never stops calling tools', async () => {
    // A pathological provider that always requests a tool.
    const runaway = {
      runToolStep: async (_req: unknown, _key: string, cbs: { onText(s: string): void }) => {
        cbs.onText('');
        return { text: 'forced answer', toolCalls: [{ id: crypto.randomUUID(), name: 'get_forecast_summary', args: {} }] };
      },
    } as unknown as AIProvider;

    const res = await runTurn(
      { ...base('chat', [{ role: 'user', content: 'loop forever' }]), provider: runaway },
      noopCbs(),
    );
    // The forced final step (tools disabled) still returns text — no infinite loop.
    expect(res.text).toBe('forced answer');
    expect(res.toolTrace.length).toBeGreaterThan(0);
  });
});
