export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_HINT =
  "At least 8 characters, with uppercase, lowercase, and a number.";

export const isValidEmail = (email: string): boolean => EMAIL_RE.test(email);

export const isValidPassword = (password: string): boolean =>
  PASSWORD_RE.test(password);
