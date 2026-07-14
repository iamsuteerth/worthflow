import type { ResolvedProposedAction } from '@/ai/actions/actionSchema';
import type { PlannerOverrides } from '@/types/overrides';

// ---------------------------------------------------------------------------
// Derived "applied" state for an AI proposal.
//
// The authority for whether a proposal has been applied is the LOADED PLAN, not
// the (cloud-synced) chat message. A proposal's card reads this on every plan
// change, so two devices viewing the same conversation can never disagree with
// what's actually in each plan — and applyAction uses the same signal to no-op a
// repeat apply, which is what makes double-counting impossible.
// ---------------------------------------------------------------------------

// Does the plan carry a change stamped with this proposal's id? Guards against a
// falsy id so untagged changes (sourceProposalId === undefined) never match.
export function proposalChangeExists(overrides: PlannerOverrides, proposalId: string): boolean {
  if (!proposalId) return false;
  const inEvents = (overrides.runtimeEvents ?? []).some((e) => e.sourceProposalId === proposalId);
  const inAccounts = (overrides.scenarioAccounts ?? []).some((a) => a.sourceProposalId === proposalId);
  return inEvents || inAccounts;
}

// Whether a proposed action is reflected in the current plan. Tag-based for every
// kind that adds, creates, or edits a change (applyAction stamps the proposal id on
// it); a delete is "applied" once its target event is gone.
export function isProposalApplied(
  action: ResolvedProposedAction,
  proposalId: string,
  overrides: PlannerOverrides,
): boolean {
  if (action.kind === 'DELETE_SCENARIO_EVENT') {
    return !(overrides.runtimeEvents ?? []).some((e) => e.id === action.targetEventId);
  }
  return proposalChangeExists(overrides, proposalId);
}
