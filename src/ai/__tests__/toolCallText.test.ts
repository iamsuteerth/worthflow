import { describe, it, expect } from 'vitest';
import { extractTextToolCalls } from '@/ai/provider/toolCallText';

// The tool names a turn would expose (a representative subset).
const KNOWN = new Set(['simulate_change', 'propose_change', 'get_month', 'find_lowest_cash']);

describe('extractTextToolCalls', () => {
  it('parses the Nemotron/pythonic <function> format and coerces value types', () => {
    // The exact shape a Nemotron leak looked like (values are whitespace-padded strings).
    const text =
      '<tool_call><function=simulate_change> <parameter=kind> ADD_FD </parameter>' +
      ' <parameter=name> Test </parameter> <parameter=principal> 25000 </parameter>' +
      ' <parameter=rate> 7.5 </parameter> <parameter=durationMonths> 12 </parameter>' +
      ' <parameter=month> 2027-05 </parameter> </function> </tool_call>';

    const { toolCalls, cleanedText } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe('simulate_change');
    expect(toolCalls[0].args).toEqual({
      kind: 'ADD_FD',       // enum stays a string
      name: 'Test',        // label stays a string
      principal: 25000,     // numeric string → number (schema needs a real number)
      rate: 7.5,            // decimal string → number
      durationMonths: 12,
      month: '2027-05',     // YYYY-MM stays a string (not valid JSON)
    });
    // The raw markup must be fully stripped — nothing leaks to the user.
    expect(cleanedText).toBe('');
  });

  it('parses the Hermes JSON <tool_call> format', () => {
    const text = '<tool_call>{"name": "get_month", "arguments": {"month": "2028-06"}}</tool_call>';
    const { toolCalls, cleanedText } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe('get_month');
    expect(toolCalls[0].args).toEqual({ month: '2028-06' });
    expect(cleanedText).toBe('');
  });

  it('rejects an unknown tool name and leaves the text untouched', () => {
    const text = '<function=delete_everything> <parameter=confirm> true </parameter> </function>';
    const { toolCalls, cleanedText } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls).toHaveLength(0);
    expect(cleanedText).toBe(text);
  });

  it('does not treat a plain prose answer as a tool call', () => {
    const text = 'Your lowest-cash month is June 2028 at ₹58,026. Consider a short FD to soften it.';
    const { toolCalls, cleanedText } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls).toHaveLength(0);
    expect(cleanedText).toBe(text);
  });

  it('keeps surrounding prose while stripping the recovered block', () => {
    const text =
      "Sure, I'll simulate that.\n" +
      '<function=find_lowest_cash> </function>\n' +
      'One moment.';
    const { toolCalls, cleanedText } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe('find_lowest_cash');
    expect(cleanedText).toContain("Sure, I'll simulate that.");
    expect(cleanedText).toContain('One moment.');
    expect(cleanedText).not.toContain('<function=');
  });

  it('recovers multiple calls in document order', () => {
    const text =
      '<function=find_lowest_cash> </function>' +
      '<tool_call>{"name":"get_month","arguments":{"month":"2027-10"}}</tool_call>';
    const { toolCalls } = extractTextToolCalls(text, KNOWN);
    expect(toolCalls.map((c) => c.name)).toEqual(['find_lowest_cash', 'get_month']);
  });

  it('returns no calls for empty text', () => {
    expect(extractTextToolCalls('', KNOWN)).toEqual({ toolCalls: [], cleanedText: '' });
  });
});
