export const AI_ENABLED: boolean = (() => {
  const v = import.meta.env.VITE_AI_ENABLED;
  return v !== undefined && v !== '' && v !== 'false' && v !== '0';
})();

// Default OFF: Gemini uses the polished single-shot chat + one-shot propose paths.
// The in-browser tool loop is dormant and opt-in (set VITE_AI_TOOLS=true to experiment).
export const AI_TOOLS: boolean = (() => {
  const v = import.meta.env.VITE_AI_TOOLS;
  return v === 'true' || v === '1';
})();
