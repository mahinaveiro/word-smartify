/**
 * Auth domain types.
 *
 * These model the SESSION/IDENTITY surface the UI talks to — independent of how
 * identity is stored. The local implementation fakes it in the browser; the
 * future Supabase implementation will satisfy the same `AuthRepository`
 * interface (mapping to `auth.users`) without any UI changes.
 */

import type { ISOTimestamp, UUID } from './database'

export interface AuthUser {
  id: UUID
  email: string
  display_name: string
  email_confirmed: boolean
  created_at: ISOTimestamp
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/** Stable machine-readable reasons so the UI can render the right recovery. */
export type AuthErrorCode =
  | 'invalid_email'
  | 'weak_password'
  | 'email_taken'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'invalid_token'
  | 'not_found'
  | 'unknown'

export class AuthError extends Error {
  code: AuthErrorCode
  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

/** Narrows an unknown caught value to an AuthError (survives class identity edge cases). */
export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError || (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AuthError')
}

export interface SignUpInput {
  display_name: string
  email: string
  password: string
}

export interface SignUpResult {
  user: AuthUser
  needsConfirmation: boolean
  /**
   * Local-only affordance: the confirmation token that a real deployment would
   * email. The UI uses it to SIMULATE the confirmation click. The Supabase
   * implementation will simply omit it (confirmation happens via emailed link).
   */
  confirmationToken?: string
}
