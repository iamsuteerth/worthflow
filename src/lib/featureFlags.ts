export const AI_ENABLED: boolean = (() => {
  const v = import.meta.env.VITE_AI_ENABLED;
  return v !== undefined && v !== '' && v !== 'false' && v !== '0';
})();
