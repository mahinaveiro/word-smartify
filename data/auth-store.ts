/**
 * Local persistence backing for the AuthService.
 *
 * This is the ONLY place that stores credentials/sessions, and it is an
 * implementation detail of the local AuthRepository — never imported by UI.
 * When Supabase Auth replaces the local implementation, this file is dropped.
 *
 * SECURITY NOTE: passwords are kept in plaintext here ON PURPOSE — this is a
 * throwaway local/dev store that never leaves the device and is replaced by
 * Supabase (which hashes server-side) before real users exist.
 */

import type { AuthUser } from '@/types/auth'
import { CURRENT_USER_ID } from './local-store'

interface StoredAccount {
  user: AuthUser
  password: string
}

interface AuthSession {
  userId: string
  email: string
}

interface AuthShape {
  /** keyed by lowercased email */
  accounts: Record<string, StoredAccount>
  session: AuthSession | null
  /** token -> lowercased email */
  confirmTokens: Record<string, string>
  resetTokens: Record<string, string>
}

const STORAGE_KEY = 'word-smartify:auth:v1'

/** A ready-to-use demo account wired to the richly-seeded demo user. */
export const DEMO_EMAIL = 'demo@wordsmartify.app'
export const DEMO_PASSWORD = 'Demo!2026word'

let memory: AuthShape | null = null

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emptyShape(): AuthShape {
  return { accounts: {}, session: null, confirmTokens: {}, resetTokens: {} }
}

function seeded(shape: AuthShape): AuthShape {
  if (!shape.accounts[DEMO_EMAIL]) {
    shape.accounts[DEMO_EMAIL] = {
      password: DEMO_PASSWORD,
      user: {
        id: CURRENT_USER_ID,
        email: DEMO_EMAIL,
        display_name: 'Marisol',
        email_confirmed: true,
        created_at: '2026-06-20T09:00:00.000Z',
      },
    }
  }
  return shape
}

function load(): AuthShape {
  if (memory) return memory
  if (hasWindow()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        memory = seeded(JSON.parse(raw) as AuthShape)
        return memory
      }
    } catch {
      // corrupt — start fresh
    }
  }
  memory = seeded(emptyShape())
  return memory
}

function persist(data: AuthShape) {
  memory = data
  if (hasWindow()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // quota / private mode — memory copy still valid this session
    }
  }
}

export function readAuth(): AuthShape {
  return load()
}

export function writeAuth(mutator: (draft: AuthShape) => void): AuthShape {
  const data = load()
  mutator(data)
  persist(data)
  return data
}

export function makeToken(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return rand.replace(/-/g, '')
}
