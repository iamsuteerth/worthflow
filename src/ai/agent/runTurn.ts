import { MAX_TOOL_ITERS } from '@/ai/config';
import type { AIProvider, AgentMessage } from '@/ai/provider/types';
import type { ToolDef, ToolCall } from '@/ai/tools/types';
import type { ToolTraceEntry } from '@/ai/chat/conversation.types';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';
import { buildToolContext, type ToolContext } from '@/ai/tools/context';
import { toolDispatch } from '@/ai/tools/dispatch';

// ---------------------------------------------------------------------------
// runTurn — the bounded in-browser agent loop. It drives a tool-capable provider:
// stream a step → if the model asked for tools, dispatch them against the pure
// engine and feed the results back → repeat until the model answers (or the
// iteration cap forces a final answer). Streaming and abort are preserved; one
// ToolContext (one simulate) is shared across the whole turn.
//
// The model never mutates anything: read tools return engine values, and
// propose_change only RECORDS a validated action (surfaced here as a confirmable
// card). The user still Applies it.
// ---------------------------------------------------------------------------

export interface RunTurnArgs {
  provider: AIProvider;
  key: string;
  modelId?: string;
  systemPrompt: string;
  tools: ToolDef[];
  messages: AgentMessage[];
  mode?: 'chat' | 'propose';
  // A pre-built context (one simulate per turn) shared with the headline seed.
  // Built here if omitted.
  toolContext?: ToolContext;
}

export interface RunTurnCallbacks {
  onText(delta: string): void;
  onReset(): void; // clear the visible answer at the start of each step
}

export interface RunTurnResult {
  text: string;
  toolTrace: ToolTraceEntry[];
  proposedAction?: ResolvedProposedAction;
}

function describeToolCall(call: ToolCall): ToolTraceEntry {
  const a = (call.args && typeof call.args === 'object' ? call.args : {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === 'string' && v ? v : '');
  switch (call.name) {
    case 'get_forecast_summary': return { tool: call.name, summary: 'Reviewed the forecast summary' };
    case 'get_month': return { tool: call.name, summary: `Checked ${s(a.month) || 'a month'}` };
    case 'get_series': return { tool: call.name, summary: 'Read the forecast series' };
    case 'list_accounts': return { tool: call.name, summary: 'Listed investment accounts' };
    case 'get_account': return { tool: call.name, summary: `Checked account ${s(a.name)}`.trim() };
    case 'list_instruments': return { tool: call.name, summary: 'Listed FDs and RDs' };
    case 'get_instrument': return { tool: call.name, summary: `Checked ${s(a.name) || 'an instrument'}` };
    case 'list_scenario_changes': return { tool: call.name, summary: 'Reviewed active scenario changes' };
    case 'get_scenario_effect': return { tool: call.name, summary: 'Measured the scenario effect' };
    case 'find_lowest_cash': return { tool: call.name, summary: 'Found the lowest-cash point' };
    case 'simulate_change': return { tool: call.name, summary: 'Simulated a change' };
    case 'propose_change': return { tool: call.name, summary: 'Prepared a change to apply' };
    default: return { tool: call.name, summary: 'Used a tool' };
  }
}

function lastProposed(ctx: ToolContext): ResolvedProposedAction | undefined {
  return ctx.proposedActions[ctx.proposedActions.length - 1];
}

export async function runTurn(
  args: RunTurnArgs,
  cbs: RunTurnCallbacks,
  signal?: AbortSignal,
): Promise<RunTurnResult> {
  const { provider, key, modelId, systemPrompt, tools, messages, mode, toolContext } = args;
  if (!provider.runToolStep) throw new Error('Provider does not support tool use.');

  const ctx = toolContext ?? buildToolContext();
  const convo: AgentMessage[] = [...messages];
  const trace: ToolTraceEntry[] = [];
  let finalText = '';

  for (let iter = 0; iter < MAX_TOOL_ITERS; iter++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    cbs.onReset();

    const step = await provider.runToolStep(
      { systemPrompt, tools, messages: convo, modelId, mode },
      key,
      { onText: cbs.onText },
      signal,
    );
    finalText = step.text;

    if (!step.toolCalls || step.toolCalls.length === 0) {
      return { text: finalText, toolTrace: trace, proposedAction: lastProposed(ctx) };
    }

    convo.push({ role: 'assistant', content: step.text, toolCalls: step.toolCalls });
    const results = step.toolCalls.map((c) => toolDispatch(c, ctx));
    convo.push({ role: 'tool', toolResults: results });
    for (const c of step.toolCalls) trace.push(describeToolCall(c));
  }

  // Overflow: one final call with NO tools available, forcing a text answer.
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  cbs.onReset();
  const finalStep = await provider.runToolStep(
    { systemPrompt, tools: [], messages: convo, modelId, mode },
    key,
    { onText: cbs.onText },
    signal,
  );
  return { text: finalStep.text || finalText, toolTrace: trace, proposedAction: lastProposed(ctx) };
}
