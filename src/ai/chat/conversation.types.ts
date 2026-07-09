import type { AiErrorKind } from '@/ai/provider/types';
import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';

export type MessageRole = 'user' | 'assistant';

// Phase 2: stored lifecycle of an AI-proposed change attached to an assistant
// message. NOTE: "applied" is NOT stored here — it's derived from the live plan
// (see proposalState.isProposalApplied) so it can't drift from what's actually in a
// plan across devices. Only the user's intent / last failure is persisted:
//   pending   — awaiting the user's explicit Apply/Dismiss
//   dismissed — user declined; nothing changed
//   failed    — the last Apply couldn't take effect; `actionError` holds the reason
export type ActionStatus = 'pending' | 'dismissed' | 'failed';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  streaming?: boolean;
  error?: { kind: AiErrorKind; message: string };
  // Phase 2: a validated, user-confirmable change. Never auto-applied. Whether it has
  // been applied is derived from the plan (this message's id is the proposal id).
  proposedAction?: ResolvedProposedAction;
  actionStatus?: ActionStatus;
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
