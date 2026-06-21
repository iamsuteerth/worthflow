import geminiProvider from '@/ai/provider/geminiProvider';
import mockProvider from '@/ai/provider/mockProvider';
import type { AIProvider } from '@/ai/provider/types';

export const aiProvider: AIProvider =
  import.meta.env.VITE_AI_PROVIDER === 'mock' || import.meta.env.VITE_AUTH_MODE === 'mock'
    ? mockProvider
    : geminiProvider;
