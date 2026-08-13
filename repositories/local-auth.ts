/**
 * LOCAL AuthRepository implementation.
 *
 * Fakes identity entirely in the browser: accounts + sessions + confirmation /
 * reset tokens live in the auth store. Signing up also provisions the user's
 * `profile` and `user_stats` rows (through the same local user store the rest
 * of the app reads) so a freshly-confirmed account lands on a real, empty
 * dashboard — exactly what the Supabase version will do server-side.
 */

import type { AuthUser, SignUpInput, SignUpResult } from '@/types/auth'
import { AuthError } from '@/types/auth'
import type { AuthRepository } from './interfaces'
import type { Profile, UserStats } from '@/types/database'
import { checkPassword, isValidEmail } from '@/lib/password'
import { DEMO_EMAIL, makeToken, readAuth, writeAuth } from '@/data/auth-store'
import {
  clearActiveUserId,
  readStore,
  setActiveUserId,
  writeStore,
} from '@/data/local-store'
import { getDataset } from '@/data/dataset'
import { makeId } from '@/data/seed-utils'
import { ensureSeeded } from '@/data/seed-user'

function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const norm = (email: string) => email.trim().toLowerCase()

function provisionUserData(userId: string, displayName: string) {
  // Make sure the demo seed exists (harmless if already done), then create the
  // new user's own profile + stats rows.
  ensureSeeded()
  const ds = getDataset()
  const now = new Date().toISOString()
  writeStore((draft) => {
    if (!draft.profiles[userId]) {
      const profile: Profile = {
        id: userId,
        display_name: displayName,
        avatar_id: 'mint',
        daily_goal: 10,
        current_book_id: ds.books[0]?.id ?? null,
        created_at: now,
        updated_at: now,
      }
      draft.profiles[userId] = profile
    }
    if (!draft.stats[userId]) {
      const stats: UserStats = {
        user_id: userId,
        total_xp: 0,
        current_streak: 0,
        longest_streak: 0,
        words_learned: 0,
        words_mastered: 0,
        last_activity_at: null,
      }
      draft.stats[userId] = stats
    }
  })
}

export class LocalAuthRepository implements AuthRepository {
  async getSession(): Promise<AuthUser | null> {
    const auth = readAuth()
    if (!auth.session) return delay(null, 120)
    const account = auth.accounts[auth.session.email]
    if (!account) return delay(null, 120)
    setActiveUserId(account.user.id)
    return delay({ ...account.user }, 120)
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const email = norm(input.email)
    const displayName = input.display_name.trim()

    if (!displayName) {
      throw new AuthError('unknown', 'Please enter your name.')
    }
    if (!isValidEmail(email)) {
      throw new AuthError('invalid_email', 'Enter a valid email address.')
    }
    if (!checkPassword(input.password).valid) {
      throw new AuthError('weak_password', 'Your password does not meet the requirements.')
    }

    const existing = readAuth().accounts[email]
    if (existing) {
      throw new AuthError('email_taken', 'An account with this email already exists.')
    }

    const userId = makeId('user', Date.now() % 1_000_000_000)
    const user: AuthUser = {
      id: userId,
      email,
      display_name: displayName,
      email_confirmed: false,
      created_at: new Date().toISOString(),
    }

    // Provision the account and its user data. No session yet — must confirm.
    provisionUserData(userId, displayName)
    const token = makeToken()
    writeAuth((draft) => {
      draft.accounts[email] = { user, password: input.password }
      draft.confirmTokens[token] = email
    })

    return delay({ user: { ...user }, needsConfirmation: true, confirmationToken: token })
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const key = norm(email)
    const account = readAuth().accounts[key]

    // Generic message for missing/incorrect credentials (no user enumeration).
    if (!account || account.password !== password) {
      throw new AuthError('invalid_credentials', 'Incorrect email or password.')
    }
    if (!account.user.email_confirmed) {
      throw new AuthError(
        'email_not_confirmed',
        'Please confirm your email before signing in.',
      )
    }

    writeAuth((draft) => {
      draft.session = { userId: account.user.id, email: key }
    })
    setActiveUserId(account.user.id)
    return delay({ ...account.user })
  }

  async signOut(): Promise<void> {
    writeAuth((draft) => {
      draft.session = null
    })
    clearActiveUserId()
    return delay(undefined, 120)
  }

  async resendConfirmation(email: string): Promise<{ confirmationToken?: string }> {
    const key = norm(email)
    const account = readAuth().accounts[key]
    if (!account || account.user.email_confirmed) {
      // Nothing to do — resolve quietly.
      return delay({})
    }
    const token = makeToken()
    writeAuth((draft) => {
      draft.confirmTokens[token] = key
    })
    return delay({ confirmationToken: token })
  }

  async confirmEmail(token: string): Promise<AuthUser> {
    const auth = readAuth()
    const email = auth.confirmTokens[token]
    if (!email || !auth.accounts[email]) {
      throw new AuthError('invalid_token', 'This confirmation link is invalid or has expired.')
    }
    const updated = writeAuth((draft) => {
      draft.accounts[email].user.email_confirmed = true
      delete draft.confirmTokens[token]
    }).accounts[email].user
    return delay({ ...updated })
  }

  async requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
    const key = norm(email)
    const account = readAuth().accounts[key]
    // Never reveal whether the account exists.
    if (!account) return delay({})
    const token = makeToken()
    writeAuth((draft) => {
      draft.resetTokens[token] = key
    })
    return delay({ resetToken: token })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const auth = readAuth()
    const email = auth.resetTokens[token]
    if (!email || !auth.accounts[email]) {
      throw new AuthError('invalid_token', 'This reset link is invalid or has expired.')
    }
    if (!checkPassword(newPassword).valid) {
      throw new AuthError('weak_password', 'Your new password does not meet the requirements.')
    }
    writeAuth((draft) => {
      draft.accounts[email].password = newPassword
      delete draft.resetTokens[token]
    })
    return delay(undefined)
  }
}
