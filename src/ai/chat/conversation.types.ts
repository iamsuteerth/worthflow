import type { AiErrorKind } from '@/ai/provider/types';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

export type MessageRole = 'user' | 'assistant';

// Phase 2: lifecycle of an AI-proposed change attached to an assistant message.
//   pending   — awaiting the user's explicit Apply/Dismiss
//   applied   — Apply succeeded; `appliedEventId` is the undoable runtime event
//   dismissed — user declined; nothing changed
//   failed    — Apply was a store-guard no-op; `actionError` holds the reason
export type ActionStatus = 'pending' | 'applied' | 'dismissed' | 'failed';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  streaming?: boolean;
  error?: { kind: AiErrorKind; message: string };
  // Phase 2: a validated, user-confirmable change. Never auto-applied.
  proposedAction?: ResolvedProposedAction;
  actionStatus?: ActionStatus;
  appliedEventId?: string;
  actionError?: string;
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
