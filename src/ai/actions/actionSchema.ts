import type { MonthKey } from '@/types/simulation';

import { z } from 'zod';

// ---------------------------------------------------------------------------
// ProposedAction — the closed, Zod-validated discriminated union the AI may
// propose. It maps 1:1 onto existing guarded `plannerStore.addTransient*`
// methods. The AI cannot express anything the Scenario Lab UI couldn't already do.
//
// This is the SCHEMA layer (layer 1 of two). It validates SHAPE only: kinds,
// field presence/types, enums, positivity, and the same numeric bounds the
// forms enforce (FD/RD rate 0–15, duration 1–120). Window/range/account
// semantics that need the live forecast live in `validateAction.ts`; the store
// guards (available cash, overlap, account existence) are the final authority.
// ---------------------------------------------------------------------------

// Same "YYYY-MM" shape the engine's MonthKey and importPlan.ts use.
export const MonthKeySchema = z.custom<MonthKey>(
  (value) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value),
  { message: 'Month must be in YYYY-MM format' },
);

// Free-text label/name/description: non-empty after trim, capped like the forms
// (TextInput maxLength={50}). Kept tight so a model can't smuggle a paragraph in.
const labelSchema = z.string().trim().min(1).max(50);
const descriptionSchema = z.string().trim().min(1).max(80);

// A money amount that must be strictly positive (an expense, deposit, principal…).
const positiveAmount = z.number().finite().positive();
// A money amount that may be zero (e.g. a salary set to 0, a spend floor of 0).
const nonNegativeAmount = z.number().finite().nonnegative();
// FD/RD rate and duration mirror AddFdForm/AddRdForm bounds exactly.
const rateSchema = z.number().finite().min(0).max(15);
const durationSchema = z.number().int().min(1).max(120);
// Investment annual return, matching the account / return-override forms.
const annualReturnSchema = z.number().finite().min(-99.99).max(1000);
// A 1-based reference into the forecast's `scenarioChanges` list (which is
// index-aligned with the active scenario events). Used to edit/delete an
// existing change without ever exposing a UUID to the model.
const refSchema = z.number().int().positive();

export const proposedActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ADD_ONE_OFF_EXPENSE'),
    month: MonthKeySchema,
    amount: positiveAmount,
    label: labelSchema,
  }),
  z.object({
    kind: z.literal('ADD_CREDIT_CARD_EXPENSE'),
    month: MonthKeySchema,
    amount: positiveAmount,
    label: labelSchema,
  }),
  z.object({
    kind: z.literal('ADD_RECURRING_EXPENSE'),
    name: labelSchema,
    amount: positiveAmount,
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    frequency: z.enum(['MONTHLY', 'ANNUAL']),
  }),
  z.object({
    kind: z.literal('ADD_BONUS_INCOME'),
    month: MonthKeySchema,
    amount: positiveAmount,
    description: descriptionSchema,
  }),
  z.object({
    kind: z.literal('ADD_SALARY_CHANGE'),
    effectiveMonth: MonthKeySchema,
    newMonthlyIncome: nonNegativeAmount,
    description: descriptionSchema,
  }),
  z.object({
    kind: z.literal('ADD_SPENDING_OVERRIDE'),
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    amount: nonNegativeAmount,
  }),
  z.object({
    kind: z.literal('SET_OPENING_CASH_OVERRIDE'),
    // Negative is allowed — models starting in debt/overdraft (see MANUAL §9).
    amount: z.number().finite(),
  }),
  z.object({
    kind: z.literal('ADD_FD'),
    month: MonthKeySchema,
    principal: positiveAmount,
    rate: rateSchema,
    durationMonths: durationSchema,
    name: labelSchema,
  }),
  z.object({
    kind: z.literal('ADD_RD'),
    month: MonthKeySchema,
    monthlyContribution: positiveAmount,
    rate: rateSchema,
    durationMonths: durationSchema,
    name: labelSchema,
  }),
  z.object({
    kind: z.literal('ADD_INVESTMENT_DEPOSIT'),
    accountName: labelSchema,
    month: MonthKeySchema,
    amount: positiveAmount,
  }),
  z.object({
    kind: z.literal('ADD_INVESTMENT_WITHDRAWAL'),
    accountName: labelSchema,
    month: MonthKeySchema,
    amount: positiveAmount,
  }),
  z.object({
    kind: z.literal('CREATE_INVESTMENT_ACCOUNT'),
    name: labelSchema,
    startMonth: MonthKeySchema,
    openingBalance: nonNegativeAmount,
    defaultMonthlyContribution: nonNegativeAmount,
    defaultAnnualReturn: annualReturnSchema,
  }).refine(
    (a) => a.openingBalance > 0 || a.defaultMonthlyContribution > 0,
    { message: 'An account needs an opening balance or a monthly contribution.' },
  ),
  z.object({
    kind: z.literal('ADD_ACCOUNT_AMOUNT_OVERRIDE'),
    accountName: labelSchema,
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    amount: nonNegativeAmount,
  }),
  z.object({
    kind: z.literal('ADD_ACCOUNT_RETURN_OVERRIDE'),
    accountName: labelSchema,
    startMonth: MonthKeySchema,
    endMonth: MonthKeySchema,
    annualReturn: annualReturnSchema,
  }),
  // Edit an existing scenario change. `ref` selects it; provide whichever
  // field(s) apply to that change's type (others are ignored). `amount` may be
  // negative only for an opening-cash override (enforced at apply/feasibility).
  z.object({
    kind: z.literal('EDIT_SCENARIO_EVENT'),
    ref: refSchema,
    amount: z.number().finite().optional(),
    month: MonthKeySchema.optional(),
    rate: rateSchema.optional(),
    durationMonths: durationSchema.optional(),
    annualReturn: annualReturnSchema.optional(),
  }).refine(
    (a) =>
      a.amount !== undefined || a.month !== undefined || a.rate !== undefined ||
      a.durationMonths !== undefined || a.annualReturn !== undefined,
    { message: 'An edit must change at least one field.' },
  ),
  z.object({
    kind: z.literal('DELETE_SCENARIO_EVENT'),
    ref: refSchema,
  }),
]);

export type ProposedAction = z.infer<typeof proposedActionSchema>;
export type ProposedActionKind = ProposedAction['kind'];

// After validation, edit/delete actions carry the resolved runtime-event id
// (resolved app-side from `ref` — the model never sees it). All other kinds are
// unchanged. This is what gets stored on a Message and passed to applyAction.
export type ResolvedProposedAction =
  | Exclude<ProposedAction, { kind: 'EDIT_SCENARIO_EVENT' } | { kind: 'DELETE_SCENARIO_EVENT' }>
  | (Extract<ProposedAction, { kind: 'EDIT_SCENARIO_EVENT' }> & { targetEventId: string })
  | (Extract<ProposedAction, { kind: 'DELETE_SCENARIO_EVENT' }> & { targetEventId: string });

// Kinds whose Apply adds exactly one runtime event → one-click Undo via
// deleteRuntimeEvent. (CREATE_INVESTMENT_ACCOUNT mutates the base config, and
// edit/delete have no single added event — those revert by loading a save.)
export function isUndoableAdd(kind: ProposedActionKind): boolean {
  return (
    kind !== 'CREATE_INVESTMENT_ACCOUNT' &&
    kind !== 'EDIT_SCENARIO_EVENT' &&
    kind !== 'DELETE_SCENARIO_EVENT'
  );
}

// The full set of recognised kinds — handy for prompts and exhaustive checks.
export const PROPOSED_ACTION_KINDS: readonly ProposedActionKind[] = [
  'ADD_ONE_OFF_EXPENSE',
  'ADD_CREDIT_CARD_EXPENSE',
  'ADD_RECURRING_EXPENSE',
  'ADD_BONUS_INCOME',
  'ADD_SALARY_CHANGE',
  'ADD_SPENDING_OVERRIDE',
  'SET_OPENING_CASH_OVERRIDE',
  'ADD_FD',
  'ADD_RD',
  'ADD_INVESTMENT_DEPOSIT',
  'ADD_INVESTMENT_WITHDRAWAL',
  'CREATE_INVESTMENT_ACCOUNT',
  'ADD_ACCOUNT_AMOUNT_OVERRIDE',
  'ADD_ACCOUNT_RETURN_OVERRIDE',
  'EDIT_SCENARIO_EVENT',
  'DELETE_SCENARIO_EVENT',
] as const;
