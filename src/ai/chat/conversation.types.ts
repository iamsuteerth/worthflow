import type { AiErrorKind } from '@/ai/provider/types';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  streaming?: boolean;
  error?: { kind: AiErrorKind; message: string };
}

export interface Conversation {
  v: 1;
  messages: Message[];
  summary?: string;
  contextEpochId: string;
  startedAt: string;
  updatedAt: string;
}

export function emptyConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    v: 1,
    messages: [],
    contextEpochId: crypto.randomUUID(),
    startedAt: now,
    updatedAt: now,
  };
}
