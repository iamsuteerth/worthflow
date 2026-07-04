import type { ToolDef } from '@/ai/tools/types';
import { PROPOSED_ACTION_KINDS } from '@/ai/actions/actionSchema';

// ---------------------------------------------------------------------------
// The tool set the model is offered. Read tools replace the static 16 KB pack —
// the model pulls exactly the figures it needs, each an engine-computed value.
// Action tools reuse the Phase-2 pipeline. Every schema is MCP-shaped; adapters
// translate this list to each provider's native tool format.
//
// Keep names/descriptions in sync with the handlers in dispatch.ts.
// ---------------------------------------------------------------------------

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false } as const;

// Action tools take the ProposedAction object directly as their arguments (the
// same shape the JSON action mode uses). The wire schema only pins `kind`; the
// real gate is Zod + validateAction inside the handler.
const ACTION_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: [...PROPOSED_ACTION_KINDS] },
  },
  required: ['kind'],
  additionalProperties: true,
} as const;

export const READ_TOOL_DEFS: ToolDef[] = [
  {
    name: 'get_forecast_summary',
    description:
      'Headline totals for the whole forecast: final net worth, final cash, final investment corpus, lowest cash + its month, portfolio XIRR %, total income/expenses, horizon length, start month, and whether a scenario is active. Call this first to orient.',
    inputSchema: NO_ARGS,
  },
  {
    name: 'get_month',
    description:
      'Exact engine values AT a specific month: cash, net worth, investments, FD book value, RD book value. Use this for any month-specific question instead of guessing. Month is "YYYY-MM".',
    inputSchema: {
      type: 'object',
      properties: { month: { type: 'string', description: 'Target month, "YYYY-MM".' } },
      required: ['month'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_series',
    description:
      'A windowed monthly series (labels + cash/netWorth/investments/fd/rd arrays, parallel to labels). Optional "from"/"to" ("YYYY-MM") bound the window; omit for the whole forecast. Long ranges are down-sampled to year-ends plus the lowest-cash month.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Window start "YYYY-MM" (optional).' },
        to: { type: 'string', description: 'Window end "YYYY-MM" (optional).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_accounts',
    description: 'All investment accounts with current value, XIRR %, total contributions, and whether each was added in the active scenario.',
    inputSchema: NO_ARGS,
  },
  {
    name: 'get_account',
    description: 'One investment account by name (value, XIRR %, contributions, added-in-scenario).',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_instruments',
    description: 'All FDs and RDs with principal/contribution, rate %, start month, maturity month and maturity value.',
    inputSchema: NO_ARGS,
  },
  {
    name: 'get_instrument',
    description: 'One FD or RD by name.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_scenario_changes',
    description: 'The active scenario changes as a numbered list (the number is the 1-based ref used to edit/delete a change), plus whether a scenario is active.',
    inputSchema: NO_ARGS,
  },
  {
    name: 'get_scenario_effect',
    description: 'The grounded base-vs-scenario effect: final net worth and lowest-cash on both the base plan and the scenario. Present only when a scenario is active.',
    inputSchema: NO_ARGS,
  },
  {
    name: 'find_lowest_cash',
    description: 'The month and amount of the lowest cash point in the forecast.',
    inputSchema: NO_ARGS,
  },
];

export const ACTION_TOOL_DEFS: ToolDef[] = [
  {
    name: 'simulate_change',
    description:
      'Dry-run a candidate change WITHOUT applying it, and get the real engine delta (lowest cash + final net worth, before vs after). Use this to compare options before proposing one. Pass a single action object (kind + its fields), same shape as propose_change. Nothing is applied.',
    inputSchema: ACTION_SCHEMA,
  },
  {
    name: 'propose_change',
    description:
      'Offer the user ONE confirmable change to their plan. Pass a single action object (kind + its fields). This does NOT apply the change — it renders a card the user must Apply. Use exactly the field names and rules from the action guidance. Propose only after you are confident the change matches the request.',
    inputSchema: ACTION_SCHEMA,
  },
];

export const ALL_TOOL_DEFS: ToolDef[] = [...READ_TOOL_DEFS, ...ACTION_TOOL_DEFS];
