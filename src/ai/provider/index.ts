import type { AIProvider, ProviderId } from '@/ai/provider/types';

import geminiProvider from '@/ai/provider/geminiProvider';
import mockProvider from '@/ai/provider/mockProvider';

// When the app is built/run in mock mode, every provider request is served by the
// deterministic mock — regardless of what the stored keyblob says — so `dev:mock`
// and the test suite run offline with no keys (mock-first philosophy).
const MOCK_MODE =
  import.meta.env.VITE_AI_PROVIDER === 'mock' || import.meta.env.VITE_AUTH_MODE === 'mock';

// The registry: providers with a real adapter.
const REGISTRY: Partial<Record<ProviderId, AIProvider>> = {
  gemini: geminiProvider,
  mock: mockProvider,
};

/** Whether a provider has a usable adapter in this build (independent of the catalog). */
export function isProviderRegistered(id: ProviderId): boolean {
  if (MOCK_MODE) return true; // mock stands in for any provider
  return REGISTRY[id] !== undefined;
}

/**
 * Resolve the adapter for a provider id. In mock mode this is always the mock
 * provider. Falls back to the mock provider for an unregistered id rather than
 * throwing, so a stale/unknown blob can never crash a turn.
 */
export function getProvider(id: ProviderId): AIProvider {
  if (MOCK_MODE) return mockProvider;
  return REGISTRY[id] ?? mockProvider;
}

// Back-compat single export (the default Gemini path). Retained for any caller
// that doesn't select by provider id.
export const aiProvider: AIProvider = MOCK_MODE ? mockProvider : geminiProvider;
