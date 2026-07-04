import { createOpenAiCompatibleProvider } from '@/ai/provider/openAiCompatible';
import { getDefaultModelId, PROVIDER_LABELS } from '@/ai/provider/modelCatalog';

// OpenRouter — an aggregator. The prompt + context transit OpenRouter AND the
// downstream model host; the disclosure copy states this. Referrer/title headers
// are OpenRouter's recommended attribution + allow-list mechanism.
function attributionHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'X-Title': 'Worth Flow' };
  if (typeof window !== 'undefined' && window.location?.origin) {
    h['HTTP-Referer'] = window.location.origin;
  }
  return h;
}

const openrouterProvider = createOpenAiCompatibleProvider({
  id: 'openrouter',
  label: PROVIDER_LABELS.openrouter,
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  // Prompt caching varies by the routed model and isn't controlled here.
  capabilities: { tools: true, promptCaching: false, browserDirect: true, streaming: true },
  defaultModelId: () => getDefaultModelId('openrouter'),
  extraHeaders: attributionHeaders,
  supportsJsonMode: false,
});

export default openrouterProvider;
