import { describe, it, expect } from 'vitest';
import { looksLikeActionRequest } from '@/ai/actions/intentRouting';

describe('looksLikeActionRequest — Send-button intent routing', () => {
  it('routes clear leading imperatives to the action flow', () => {
    expect(looksLikeActionRequest('Create SBI ETF Fund in Jan 2027')).toBe(true);
    expect(looksLikeActionRequest('Add an expense for macbook worth 250000 in Dec 2028')).toBe(true);
    expect(looksLikeActionRequest('Delete my sbi contra fund account')).toBe(true);
    expect(looksLikeActionRequest('remove change 2')).toBe(true);
    expect(looksLikeActionRequest('Set my opening cash to 50000')).toBe(true);
    expect(looksLikeActionRequest('Start an FD of 2 lakh next month')).toBe(true);
    expect(looksLikeActionRequest('please add a bonus in March 2026')).toBe(true);
  });

  it('routes first-person intent phrasings ("I want to …")', () => {
    expect(looksLikeActionRequest('I want you to create a new account')).toBe(true);
    expect(looksLikeActionRequest('I want to add a one-off expense')).toBe(true);
    expect(looksLikeActionRequest('I want to destroy a scenario change')).toBe(true);
    expect(looksLikeActionRequest('I want to start an FD')).toBe(true);
    expect(looksLikeActionRequest("I'd like to add a recurring expense")).toBe(true);
    expect(looksLikeActionRequest('let me create an RD')).toBe(true);
    expect(looksLikeActionRequest("let's set a spending override")).toBe(true);
  });

  it('keeps questions and normal chat in chat mode', () => {
    expect(looksLikeActionRequest('Can I start an FD next month')).toBe(false);
    expect(looksLikeActionRequest('Can I start an FD?')).toBe(false);
    expect(looksLikeActionRequest('What if I add an FD?')).toBe(false);
    expect(looksLikeActionRequest('How do I create an account?')).toBe(false);
    expect(looksLikeActionRequest('Can you add an FD for me?')).toBe(false);
    expect(looksLikeActionRequest('Should I add more to my SIP')).toBe(false);
    expect(looksLikeActionRequest('When does my cash dip lowest?')).toBe(false);
    // Intent phrasing WITHOUT an action verb → it's a question, stay in chat.
    expect(looksLikeActionRequest('I want to know my FD maturities')).toBe(false);
    expect(looksLikeActionRequest('I want to understand my net worth')).toBe(false);
    // Plain follow-ups / info requests.
    expect(looksLikeActionRequest('proceed')).toBe(false);
    expect(looksLikeActionRequest('7.5, 12')).toBe(false);
    expect(looksLikeActionRequest('Summarise my FD maturities')).toBe(false);
    expect(looksLikeActionRequest('')).toBe(false);
  });

  it('matches whole words only (no false prefixes)', () => {
    expect(looksLikeActionRequest('settle my account')).toBe(false); // not "set"
    expect(looksLikeActionRequest('started planning')).toBe(false); // not "start"
    expect(looksLikeActionRequest('adding up my expenses')).toBe(false); // not "add"
  });

  it('handles informal/repeated pleasantries and a trailing "?" on an imperative', () => {
    // Repeated + informal pleasantries are stripped; a leading verb wins over "?".
    expect(looksLikeActionRequest('pls pls pls add an fd?')).toBe(true);
    expect(looksLikeActionRequest('Add an FD?')).toBe(true);
    expect(looksLikeActionRequest('please please add a bonus')).toBe(true);
    expect(looksLikeActionRequest('kindly create an RD')).toBe(true);
    expect(looksLikeActionRequest('ok, delete change 2')).toBe(true);
    // But a leading question word still wins, even with the same content.
    expect(looksLikeActionRequest('pls can I add an FD?')).toBe(false);
    expect(looksLikeActionRequest('Is adding an FD a good idea?')).toBe(false);
  });

  it('degrades safely on junk / pleasantry-only / whitespace', () => {
    expect(looksLikeActionRequest('   ')).toBe(false);
    expect(looksLikeActionRequest('please')).toBe(false);
    expect(looksLikeActionRequest('pls pls pls')).toBe(false);
    expect(looksLikeActionRequest('!!!')).toBe(false);
    expect(looksLikeActionRequest('🎉')).toBe(false);
  });
});
