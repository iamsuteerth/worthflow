// ---------------------------------------------------------------------------
// The neutral, in-browser "MCP-shaped" tool contract. Tools are declared exactly
// as an MCP server would declare them ({ name, description, inputSchema }) and
// dispatched in-process against the pure engine — the transport is a function
// call, not a socket. Each provider adapter translates this neutral triple to and
// from its native tool/function-calling format.
// ---------------------------------------------------------------------------

// A minimal JSON-Schema object (MCP inputSchema). Kept loose on purpose — the real
// validation of action tools is Zod (validateAction), not the wire schema.
export type JsonSchema = Record<string, unknown>;

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

// A model's request to run a tool. `args` is untrusted JSON — every handler
// treats it defensively and (for action tools) runs it through Zod/validateAction.
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

// The engine-computed answer handed back to the model. `content` is compact JSON.
export interface ToolResult {
  id: string;
  name: string;
  content: string;
  isError?: boolean;
}
