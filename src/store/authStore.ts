import { create } from 'zustand'
import { authService, type AuthUser } from '@/lib/auth'

interface AuthStore {
  user: AuthUser | null
  authenticated: boolean
  loading: boolean
  hydrate: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  authenticated: false,
  loading: true,

  hydrate: async () => {
    const user = await authService.currentUser()
    set({ user, authenticated: user !== null, loading: false })
  },

  signIn: async (email, password) => {
    await authService.signIn(email, password)
    const user = await authService.currentUser()
    set({ user, authenticated: user !== null })
  },

  signUp: async (email, password) => {
    await authService.signUp(email, password)
  },

  confirmSignUp: async (email, code) => {
    await authService.confirmSignUp(email, code)
  },

  resendSignUpCode: async (email) => {
    await authService.resendSignUpCode(email)
  },

  signOut: async () => {
    await authService.signOut()
    set({ user: null, authenticated: false })
    const { usePlannerStore } = await import('@/store/plannerStore')
    usePlannerStore.getState().resetForSignOut()
    const { useCloudStore } = await import('@/store/cloudStore')
    useCloudStore.setState({ saves: [], savesError: null, initialLoadFailed: false })
  },
}))
