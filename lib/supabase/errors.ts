import { AuthError } from '@/types/auth'

export function toAuthError(error: unknown, fallback = 'Authentication failed. Please try again.') {
  if (error instanceof AuthError) return error

  const message = error instanceof Error ? error.message.toLowerCase() : ''
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0

  if (message.includes('already registered') || message.includes('already exists') || message.includes('duplicate')) {
    return new AuthError('email_taken', 'An account with this email already exists.')
  }
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return new AuthError('invalid_credentials', 'The email or password is incorrect.')
  }
  if (message.includes('email not confirmed')) {
    return new AuthError('email_not_confirmed', 'Please confirm your email before signing in.')
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
    return new AuthError('weak_password', 'Choose a stronger password.')
  }
  if (status === 404 || message.includes('not found')) {
    return new AuthError('not_found', 'The requested account or record was not found.')
  }

  return new AuthError('unknown', fallback)
}

export function isMissingRowError(error: { code?: string } | null | undefined) {
  return error?.code === 'PGRST116'
}
