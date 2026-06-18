export interface AuthUser {
  userId: string
  email: string
  memberSince: string
}

export interface AuthService {
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  confirmSignUp(email: string, code: string): Promise<void>
  resendSignUpCode(email: string): Promise<void>
  signOut(): Promise<void>
  currentUser(): Promise<AuthUser | null>
  resetPassword(email: string): Promise<void>
  confirmResetPassword(email: string, code: string, newPassword: string): Promise<void>
}

const MOCK_USERS_KEY = '__fp_mock_users'
const MOCK_SESSION_KEY = '__fp_mock_session'

function loadMockUsers(): Map<string, string> {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY)
    if (!raw) return new Map()
    return new Map(JSON.parse(raw) as [string, string][])
  } catch {
    return new Map()
  }
}

function persistMockUsers(map: Map<string, string>): void {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([...map]))
}

const _pendingUsers = new Map<string, string>()
const _confirmedUsers = loadMockUsers()

function loadMockSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function persistMockSession(user: AuthUser | null): void {
  if (user) sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(MOCK_SESSION_KEY)
}

let _mockUser: AuthUser | null = loadMockSession()

class MockAuthService implements AuthService {
  async signIn(email: string, password: string): Promise<void> {
    const stored = _confirmedUsers.get(email)
    if (!stored) throw new Error('No account found for this email.')
    if (stored !== password) throw new Error('Incorrect password.')
    _mockUser = { userId: `mock-${btoa(email)}`, email, memberSince: '2026-01-01T00:00:00.000Z' }
    persistMockSession(_mockUser)
  }

  async signUp(email: string, password: string): Promise<void> {
    if (_confirmedUsers.has(email) || _pendingUsers.has(email))
      throw new Error('UsernameExistsException')
    _pendingUsers.set(email, password)
    _mockUser = null
    persistMockSession(null)
  }

  async confirmSignUp(email: string): Promise<void> {
    const password = _pendingUsers.get(email)
    if (!password) throw new Error('No pending sign-up for this email.')
    _confirmedUsers.set(email, password)
    _pendingUsers.delete(email)
    persistMockUsers(_confirmedUsers)
  }

  async resendSignUpCode(email: string): Promise<void> {
    if (_confirmedUsers.has(email)) throw new Error('Already confirmed.')
    if (!_pendingUsers.has(email)) throw new Error('No pending sign-up for this email.')
  }

  async signOut(): Promise<void> {
    _mockUser = null
    persistMockSession(null)
  }

  async currentUser(): Promise<AuthUser | null> {
    return _mockUser
  }

  async resetPassword(): Promise<void> {}

  async confirmResetPassword(email: string, _code: string, newPassword: string): Promise<void> {
    if (_confirmedUsers.has(email)) {
      _confirmedUsers.set(email, newPassword)
      persistMockUsers(_confirmedUsers)
    }
  }
}

class CognitoAuthService implements AuthService {
  async signIn(email: string, password: string): Promise<void> {
    const { signIn } = await import('aws-amplify/auth')
    await signIn({ username: email, password })
  }

  async signUp(email: string, password: string): Promise<void> {
    const { signUp } = await import('aws-amplify/auth')
    await signUp({ username: email, password })
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    const { confirmSignUp } = await import('aws-amplify/auth')
    await confirmSignUp({ username: email, confirmationCode: code })
  }

  async resendSignUpCode(email: string): Promise<void> {
    const { resendSignUpCode } = await import('aws-amplify/auth')
    await resendSignUpCode({ username: email })
  }

  async signOut(): Promise<void> {
    const { signOut } = await import('aws-amplify/auth')
    await signOut()
  }

  async currentUser(): Promise<AuthUser | null> {
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth')
      await getCurrentUser()
      const attrs = await fetchUserAttributes()
      return {
        userId: attrs.sub ?? '',
        email: attrs.email ?? '',
        memberSince: attrs['custom:member_since'] ?? '',
      }
    } catch {
      return null
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { resetPassword } = await import('aws-amplify/auth')
    await resetPassword({ username: email })
  }

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const { confirmResetPassword } = await import('aws-amplify/auth')
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword })
  }
}

export const authService: AuthService =
  import.meta.env.VITE_AUTH_MODE === 'mock'
    ? new MockAuthService()
    : new CognitoAuthService()
