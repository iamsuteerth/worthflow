import type { ToolCall } from '@/ai/tools/types';

// ---------------------------------------------------------------------------
// Text-embedded tool-call recovery.
//
// Some open models (notably NVIDIA Nemotron, and other Hermes-lineage models
// served via OpenRouter) sometimes emit a tool call as PLAIN TEXT in the message
// body instead of via the native `tool_calls` field. Left unparsed, that raw
// markup leaks straight to the user (e.g. a literal `<tool_call><function=…>`
// block) or resolves to an empty answer. This recovers those calls so they run
// the normal validated path (validateAction → dryRun / confirmable card) exactly
// like a native tool call would.
//
// Two on-the-wire formats are recognised — the ones open models actually emit:
//   A (pythonic):  <function=NAME> <parameter=k> v </parameter> … </function>
//                  (optionally wrapped in <tool_call>…</tool_call>)
//   B (Hermes):    <tool_call>{"name":"NAME","arguments":{…}}</tool_call>
//
// Bare fenced JSON is deliberately NOT parsed — it is indistinguishable from a
// legitimate JSON answer and would risk false positives. A parsed call is only
// accepted if its name is a known tool for this turn (the trust gate); anything
// else is left as text and never dispatched.
// ---------------------------------------------------------------------------

export interface ExtractedToolCalls {
  toolCalls: ToolCall[];
  cleanedText: string; // the message text with recovered call blocks removed
}

const FUNCTION_BLOCK = /<function=([^>\s]+)\s*>([\s\S]*?)<\/function>/g;
const PARAM = /<parameter=([^>\s]+)\s*>([\s\S]*?)<\/parameter>/g;
const HERMES_JSON = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;

// Coerce a Format-A parameter string to the value a tool schema expects. The
// action schema is strict (`z.number()`, no coercion), so "25000" must become a
// real number. Scalars only: "25000"→25000, "7.5"→7.5, "true"→true; anything
// non-scalar (enums like "ADD_FD", months like "2027-05", names) stays a string.
function coerceValue(raw: string): unknown {
  const s = raw.trim();
  if (s === '') return '';
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === 'number' || typeof parsed === 'boolean' || parsed === null) return parsed;
    return s;
  } catch {
    return s;
  }
}

interface Found {
  start: number;
  end: number;
  call: ToolCall;
}

function removeSpans(text: string, spans: Array<{ start: number; end: number }>): string {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue; // overlap safety
    out += text.slice(cursor, s.start);
    cursor = s.end;
  }
  return out + text.slice(cursor);
}

export function extractTextToolCalls(text: string, knownNames: Set<string>): ExtractedToolCalls {
  if (!text) return { toolCalls: [], cleanedText: '' };

  const found: Found[] = [];

  // Format A — <function=NAME><parameter=k>v</parameter>…</function>
  for (const m of text.matchAll(FUNCTION_BLOCK)) {
    const name = m[1];
    if (!knownNames.has(name)) continue;
    const args: Record<string, unknown> = {};
    for (const p of m[2].matchAll(PARAM)) args[p[1]] = coerceValue(p[2]);
    found.push({ start: m.index!, end: m.index! + m[0].length, call: { id: crypto.randomUUID(), name, args } });
  }

  // Format B — <tool_call>{"name":…,"arguments":{…}}</tool_call>. Skip spans that
  // overlap a Format-A block (a <function> wrapped inside <tool_call>…</tool_call>).
  for (const m of text.matchAll(HERMES_JSON)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (found.some((f) => start < f.end && end > f.start)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const obj = parsed as { name?: unknown; arguments?: unknown };
    if (typeof obj.name !== 'string' || !knownNames.has(obj.name)) continue;
    const args = obj.arguments && typeof obj.arguments === 'object' ? obj.arguments : {};
    found.push({ start, end, call: { id: crypto.randomUUID(), name: obj.name, args } });
  }

  if (found.length === 0) return { toolCalls: [], cleanedText: text };

  found.sort((a, b) => a.start - b.start);
  const cleanedText = removeSpans(text, found)
    .replace(/<\/?tool_call>/g, '') // drop any lone wrapper tags left around Format-A blocks
    .trim();
  return { toolCalls: found.map((f) => f.call), cleanedText };
}
