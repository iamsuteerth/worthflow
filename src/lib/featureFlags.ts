export const AI_ENABLED: boolean = (() => {
  const v = import.meta.env.VITE_AI_ENABLED;
  return v !== undefined && v !== '' && v !== 'false' && v !== '0';
})();

// V4 in-browser tool-use (the agent loop). ON by default; the kill-switch
// (VITE_AI_TOOLS=false) reverts the assistant to the exact v3.3 static-pack path
// for any provider whose tool-use misbehaves in production.
export const AI_TOOLS: boolean = (() => {
  const v = import.meta.env.VITE_AI_TOOLS;
  return v !== 'false' && v !== '0';
})();
