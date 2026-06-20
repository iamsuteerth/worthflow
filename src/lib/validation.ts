// Single source of truth for client-side auth input validation.
// These mirror the Cognito user-pool policy for instant UX feedback only —
// Cognito remains the enforcing authority on the server side.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Min 8 chars, at least one lowercase, one uppercase, one number (no symbol required).
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_HINT =
  "At least 8 characters, with uppercase, lowercase, and a number.";

export const isValidEmail = (email: string): boolean => EMAIL_RE.test(email);

export const isValidPassword = (password: string): boolean =>
  PASSWORD_RE.test(password);
