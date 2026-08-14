'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { repositories } from '@/repositories'
import type { AuthUser, SignUpInput, SignUpResult } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: boolean
  signIn: (email: string, password: string) => Promise<AuthUser>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
  resendConfirmation: (email: string) => Promise<{ confirmationToken?: string }>
  confirmEmail: (token: string) => Promise<AuthUser>
  requestPasswordReset: (email: string) => Promise<{ resetToken?: string }>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = repositories.auth
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setError(false)
    try {
      const session = await auth.getSession()
      setUser(session)
    } catch (reason) {
      setError(true)
      throw reason
    }
  }, [auth])

  useEffect(() => {
    let active = true
    const unsubscribe = auth.onAuthStateChange?.((session) => {
      if (active) {
        setUser(session)
        setLoading(false)
      }
    })

    auth
      .getSession()
      .then((session) => {
        if (active) setUser(session)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [auth])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const signedInUser = await auth.signIn(email, password)
      setUser(signedInUser)
      return signedInUser
    },
    [auth],
  )

  const signUp = useCallback((input: SignUpInput) => auth.signUp(input), [auth])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setUser(null)
  }, [auth])

  const confirmEmail = useCallback(
    async (token: string) => {
      const confirmedUser = await auth.confirmEmail(token)
      setUser(confirmedUser)
      return confirmedUser
    },
    [auth],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resendConfirmation: (email: string) => auth.resendConfirmation(email),
      confirmEmail,
      requestPasswordReset: (email: string) => auth.requestPasswordReset(email),
      resetPassword: (token: string, newPassword: string) => auth.resetPassword(token, newPassword),
      changePassword: (currentPassword: string, newPassword: string) => auth.changePassword(currentPassword, newPassword),
      deleteAccount: async () => {
        await auth.deleteAccount()
        setUser(null)
      },
      refresh,
    }),
    [user, loading, error, signIn, signUp, signOut, confirmEmail, auth, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
