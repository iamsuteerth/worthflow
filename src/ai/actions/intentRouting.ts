// Should the Send button route this message straight to the action flow (like the
// wand), rather than to normal chat? Deterministic heuristic — no model call.
//
// It says YES when the message reads as an instruction to change the plan:
//   • a leading action verb            — "Create an FD…", "Delete my account", "add an fd?"
//   • a first-person intent + a verb   — "I want to add…", "I'd like you to create…"
// It says NO for questions and everything else, so normal Q&A stays in chat:
//   • a leading question word          — "Can I start an FD?", "How do I add…"
//   • intent without an action verb    — "I want to know my FD maturities"
//   • no recognised verb at all        — "proceed", "7.5, 12", "Summarise my FDs"
//
// IMPORTANT: this only chooses a mode; it can never make a wrong change. A misroute
// degrades gracefully — chat deflects to the wand (which always works), and the action
// flow clarifies/refuses and still requires an explicit Apply. Leading pleasantries
// (incl. informal/repeated "pls pls pls") are stripped first so they don't mask intent.
//
// The wand remains the explicit propose path regardless. Kept dependency-free (no
// React/store imports) so it's trivially unit-testable.

// Verbs that signal an intent to change the plan. Matched as whole words (so "settle"
// never matches "set", "started" never matches "start").
const ACTION_VERBS = new Set([
  'create', 'add', 'delete', 'remove', 'destroy', 'set', 'start', 'open',
  'deposit', 'withdraw', 'change',
]);

// Leading words that make a message a question — kept in chat even with a verb later
// ("Can I create…", "Should I add…", "How do I delete…").
const QUESTION_WORDS = new Set([
  'can', 'could', 'would', 'should', 'shall', 'will', 'may', 'might',
  'do', 'does', 'did', 'is', 'are', 'was', 'were', 'has', 'have', 'had',
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom', 'if', 'whether',
]);

// First-person intent leads — "I want to ADD…", "let me CREATE…". An action verb must
// follow shortly after, so "I want to know…" / "let me see…" stay in chat.
const INTENT_LEADS = [
  'i want to', 'i want you to', 'i wanna', 'i would like to', "i'd like to",
  "i'd like you to", 'i would like you to', "i'm going to", 'i am going to',
  'i need to', 'i plan to', 'i intend to', 'let me', "let's", 'lets',
];

// Leading pleasantries to strip — including informal and repeated ones, so
// "pls pls pls add an fd" still reads its intent. The trailing (…)+ eats repeats.
const PLEASANTRIES =
  /^((please|pls|plz|plss|kindly|hey|hi|hello|ok|okay|so|um|uh|hmm|yeah|yep|yes|sure|alright)[\s,]+)+/;

const word = (w: string): string => w.replace(/[^a-z']/g, '');

export function looksLikeActionRequest(text: string): boolean {
  let t = text.trim().toLowerCase();
  if (!t) return false;

  t = t.replace(PLEASANTRIES, '').trim();
  if (!t) return false; // pleasantries only

  const first = word(t.split(/\s+/)[0] ?? '');

  // Order matters: a leading question word wins ("can i add…" → chat), then a leading
  // action verb wins even with a trailing "?" ("add an fd?" → action).
  if (QUESTION_WORDS.has(first)) return false;
  if (ACTION_VERBS.has(first)) return true;

  // First-person intent followed (within a few words) by an action verb.
  for (const lead of INTENT_LEADS) {
    if (t === lead || t.startsWith(`${lead} `)) {
      const after = t.slice(lead.length).trim().split(/\s+/).slice(0, 5).map(word);
      if (after.some((w) => ACTION_VERBS.has(w))) return true;
    }
  }

  // No leading verb or intent → normal chat (questions, info requests, follow-ups).
  return false;
}
