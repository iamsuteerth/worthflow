import { describe, it, expect, vi } from 'vitest';

// The mock service persists users in localStorage and the session in sessionStorage.
// Node exposes an experimental, non-functional localStorage global, so force-replace
// both (a typeof guard would skip and setItem would not be a function).
vi.hoisted(() => {
  const shim = (): Storage => {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  };
  Object.defineProperty(globalThis, 'localStorage', { value: shim(), configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: shim(), configurable: true });
});

// Select the MockAuthService before the module's singleton is constructed.
vi.stubEnv('VITE_AUTH_MODE', 'mock');
const { authService } = await import('@/lib/auth');

// Module state (pending/confirmed maps) is shared across tests — use unique emails.
let n = 0;
const email = () => `user${++n}@test.dev`;

describe('MockAuthService — sign-up / confirmation lifecycle', () => {
  it('sign-up → confirm → sign-in → currentUser → sign-out', async () => {
    const e = email();
    await authService.signUp(e, 'Passw0rd1');
    await authService.confirmSignUp(e, '123456');
    await authService.signIn(e, 'Passw0rd1');

    const user = await authService.currentUser();
    expect(user?.email).toBe(e);
    expect(user?.userId).toBeTruthy();

    await authService.signOut();
    expect(await authService.currentUser()).toBeNull();
  });

  it('rejects sign-in before the account is confirmed', async () => {
    const e = email();
    await authService.signUp(e, 'Passw0rd1');
    await expect(authService.signIn(e, 'Passw0rd1')).rejects.toThrow(/no account/i);
  });

  it('rejects a wrong password and an unknown email distinctly', async () => {
    const e = email();
    await authService.signUp(e, 'Passw0rd1');
    await authService.confirmSignUp(e, '123456');

    await expect(authService.signIn(e, 'wrong')).rejects.toThrow(/incorrect password/i);
    await expect(authService.signIn('ghost@test.dev', 'x')).rejects.toThrow(/no account/i);
  });

  it('rejects a duplicate sign-up for pending AND confirmed accounts', async () => {
    const pending = email();
    await authService.signUp(pending, 'Passw0rd1');
    await expect(authService.signUp(pending, 'Other1Aa')).rejects.toThrow('UsernameExistsException');

    const confirmed = email();
    await authService.signUp(confirmed, 'Passw0rd1');
    await authService.confirmSignUp(confirmed, '123456');
    await expect(authService.signUp(confirmed, 'Other1Aa')).rejects.toThrow('UsernameExistsException');
  });

  it('rejects confirming an email that never signed up', async () => {
    await expect(authService.confirmSignUp('never@test.dev', '123456')).rejects.toThrow(/no pending/i);
  });

  it('resendSignUpCode: ok while pending, rejects when confirmed or unknown', async () => {
    const e = email();
    await authService.signUp(e, 'Passw0rd1');
    await expect(authService.resendSignUpCode(e)).resolves.toBeUndefined();

    await authService.confirmSignUp(e, '123456');
    await expect(authService.resendSignUpCode(e)).rejects.toThrow(/already confirmed/i);
    await expect(authService.resendSignUpCode('never@test.dev')).rejects.toThrow(/no pending/i);
  });
});

describe('MockAuthService — password reset', () => {
  it('confirmResetPassword replaces the password for a confirmed account', async () => {
    const e = email();
    await authService.signUp(e, 'OldPass1');
    await authService.confirmSignUp(e, '123456');

    await authService.confirmResetPassword(e, '654321', 'NewPass1');

    await expect(authService.signIn(e, 'OldPass1')).rejects.toThrow(/incorrect password/i);
    await authService.signIn(e, 'NewPass1');
    expect((await authService.currentUser())?.email).toBe(e);
  });

  it('is a silent no-op for an unknown account (no enumeration)', async () => {
    await expect(authService.confirmResetPassword('ghost@test.dev', '1', 'NewPass1')).resolves.toBeUndefined();
  });
});
