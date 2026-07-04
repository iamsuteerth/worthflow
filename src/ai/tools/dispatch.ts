import type { ToolCall, ToolResult } from '@/ai/tools/types';
import type { ToolContext } from '@/ai/tools/context';
import { buildFullSeries } from '@/ai/context/buildContextPack';
import { validateAction } from '@/ai/actions/validateAction';
import { dryRun } from '@/ai/actions/dryRun';
import { describeAction } from '@/ai/actions/describeAction';

// ---------------------------------------------------------------------------
// toolDispatch — runs a model's ToolCall in-process against the pure engine and
// returns an engine-computed answer. The load-bearing invariant of V4 is that
// every figure ORIGINATES from the engine: read tools only return values the
// engine produced (headline/rows/series), never model-authored numbers. It does
// NOT stop the model from misreading a series it fetched (get_series returns the
// arrays) — the point is that the authoritative values (get_month, find_lowest_cash,
// the summary) come straight from simulate(), so a grounded answer is always
// available. Read tools slice the shared per-turn snapshot; action tools reuse the
// exact Phase-2 pipeline (validateAction → dryRun / the confirmable card), so the
// trust boundary is unchanged.
// ---------------------------------------------------------------------------

const r = (n: number): number => Math.round(n);

interface HandlerResult {
  content: unknown;
  isError?: boolean;
}
type Handler = (args: Record<string, unknown>, ctx: ToolContext) => HandlerResult;

function err(message: string): HandlerResult {
  return { content: { error: message }, isError: true };
}

// Build the ActionValidationContext the Phase-2 validator expects.
function validationCtx(ctx: ToolContext) {
  return {
    startMonth: ctx.config.forecast.startMonth,
    totalMonths: ctx.config.forecast.totalMonths,
    accountNames: ctx.accountNames,
    scenarioEventIds: ctx.scenarioEventIds,
  };
}

const HANDLERS: Record<string, Handler> = {
  get_forecast_summary: (_args, ctx) => ({
    content: {
      ...ctx.pack.headline,
      horizonMonths: ctx.pack.meta.horizonMonths,
      startMonth: ctx.pack.meta.startMonth,
      hasActiveScenario: ctx.pack.meta.hasActiveScenario,
    },
  }),

  get_month: (args, ctx) => {
    const month = String(args.month ?? '').trim();
    const rows = ctx.result.rows;
    const row = rows.find((x) => x.month === month);
    if (!row) {
      const first = rows[0]?.month ?? '';
      const last = rows[rows.length - 1]?.month ?? '';
      return err(`${month || 'That month'} is not in the forecast (which runs ${first} to ${last}).`);
    }
    return {
      content: {
        month,
        cash: r(row.assets.cash),
        netWorth: r(row.assets.netWorth),
        investments: r(row.assets.investmentCorpus),
        fd: r(row.assets.fdValue),
        rd: r(row.assets.rdValue),
      },
    };
  },

  get_series: (args, ctx) => {
    const from = args.from ? String(args.from) : undefined;
    const to = args.to ? String(args.to) : undefined;
    return { content: buildFullSeries(ctx.result, from, to) };
  },

  list_accounts: (_args, ctx) => ({ content: ctx.pack.accounts }),

  get_account: (args, ctx) => {
    const name = String(args.name ?? '').trim().toLowerCase();
    const acct = ctx.pack.accounts.find((a) => a.name.toLowerCase() === name);
    if (!acct) {
      return err(`No account named "${args.name ?? ''}". Available: ${ctx.pack.accounts.map((a) => a.name).join(', ') || 'none'}.`);
    }
    return { content: acct };
  },

  list_instruments: (_args, ctx) => ({ content: ctx.pack.instruments }),

  get_instrument: (args, ctx) => {
    const name = String(args.name ?? '').trim().toLowerCase();
    const inst = ctx.pack.instruments.find((i) => i.name.toLowerCase() === name);
    if (!inst) {
      return err(`No FD/RD named "${args.name ?? ''}". Available: ${ctx.pack.instruments.map((i) => i.name).join(', ') || 'none'}.`);
    }
    return { content: inst };
  },

  list_scenario_changes: (_args, ctx) => ({
    content: {
      hasActiveScenario: ctx.pack.meta.hasActiveScenario,
      changes: ctx.pack.scenarioChanges,
    },
  }),

  get_scenario_effect: (_args, ctx) => {
    if (!ctx.pack.scenarioEffect) {
      return { content: { hasActiveScenario: false, note: 'No active scenario — the plan matches its base.' } };
    }
    return { content: ctx.pack.scenarioEffect };
  },

  find_lowest_cash: (_args, ctx) => ({
    content: { month: ctx.pack.headline.lowestCashMonth, amount: ctx.pack.headline.lowestCash },
  }),

  // ---- Action tools (user Apply still mandatory) -------------------------

  simulate_change: (args, ctx) => {
    const v = validateAction(args, validationCtx(ctx));
    if (!v.ok) return err(v.message);
    const delta = dryRun(v.action);
    if (!delta) return err("That change couldn't be simulated against the current plan.");
    return {
      content: {
        applied: false,
        summary: describeAction(v.action),
        lowestCashBefore: delta.lowestCashBefore,
        lowestCashAfter: delta.lowestCashAfter,
        finalNetWorthBefore: delta.finalNetWorthBefore,
        finalNetWorthAfter: delta.finalNetWorthAfter,
      },
    };
  },

  propose_change: (args, ctx) => {
    const v = validateAction(args, validationCtx(ctx));
    if (!v.ok) return err(v.message);
    // Record it for the agent loop to surface as a confirmable card. Nothing is
    // applied here — the user still confirms.
    ctx.proposedActions.push(v.action);
    return { content: { proposed: true, summary: describeAction(v.action) } };
  },
};

export function toolDispatch(call: ToolCall, ctx: ToolContext): ToolResult {
  const handler = HANDLERS[call.name];
  if (!handler) {
    return { id: call.id, name: call.name, content: JSON.stringify({ error: `Unknown tool "${call.name}".` }), isError: true };
  }
  try {
    const args = (call.args && typeof call.args === 'object' ? call.args : {}) as Record<string, unknown>;
    const out = handler(args, ctx);
    return { id: call.id, name: call.name, content: JSON.stringify(out.content), isError: out.isError };
  } catch {
    return { id: call.id, name: call.name, content: JSON.stringify({ error: 'That tool failed to run.' }), isError: true };
  }
}

export const TOOL_NAMES = Object.keys(HANDLERS);
