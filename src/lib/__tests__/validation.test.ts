import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword } from '@/lib/validation';
import { getInitials, formatDate, formatDateShort } from '@/utils/display';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain.dev')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'plain', 'a@b', 'a@.com', '@b.com', 'a b@c.com', 'a@b c.com', 'a@@b.com']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});

describe('isValidPassword — mirrors the Cognito policy', () => {
  it('requires 8+ chars with upper, lower, and a digit', () => {
    expect(isValidPassword('Passw0rd')).toBe(true);
    expect(isValidPassword('Passw0rd!with-symbols')).toBe(true); // symbols allowed, not required
  });

  it('rejects each missing requirement', () => {
    expect(isValidPassword('passw0rd')).toBe(false); // no uppercase
    expect(isValidPassword('PASSW0RD')).toBe(false); // no lowercase
    expect(isValidPassword('Password')).toBe(false); // no digit
    expect(isValidPassword('Pass0rd')).toBe(false); // 7 chars
    expect(isValidPassword('')).toBe(false);
  });
});

describe('display helpers', () => {
  it('getInitials uses the first mailbox character, uppercased, with a fallback', () => {
    expect(getInitials('john@x.com')).toBe('J');
    expect(getInitials('ärya@x.com')).toBe('Ä');
    expect(getInitials('@x.com')).toBe('?');
    expect(getInitials('')).toBe('?');
  });

  it('formatDate/formatDateShort render a date and em-dash on empty', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDateShort('')).toBe('—');
    expect(formatDate('2026-07-03T00:00:00.000Z')).toMatch(/2026/);
    expect(formatDateShort('2026-07-03T00:00:00.000Z')).toMatch(/2026/);
  });
});
