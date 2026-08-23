import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { AuthError, type AuthUser, type SignUpInput, type SignUpResult } from '@/types/auth'
import type { AuthRepository } from './interfaces'
import { getPublicSiteUrl } from '@/lib/supabase/config'
import { toAuthError } from '@/lib/supabase/errors'
import { validateAvatarUrl } from '@/lib/profile'

function metadataString(user: User, ...keys: string[]) {
  for (const key of keys) {
    const value = user.user_metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function displayNameFrom(user: User) {
  return metadataString(user, 'display_name', 'full_name', 'name') ?? user.email?.split('@')[0] ?? 'Learner'
}

function avatarUrlFrom(user: User) {
  const candidate = metadataString(user, 'avatar_url', 'picture')
  if (!candidate || validateAvatarUrl(candidate)) return null
  return candidate
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: displayNameFrom(user),
    email_confirmed: Boolean(user.email_confirmed_at),
    created_at: user.created_at,
  }
}

type Client = SupabaseClient<Database>

async function provisionUserRows(client: Client, user: User, displayName = displayNameFrom(user)) {
  const googleAvatarUrl = avatarUrlFrom(user)
  const profile = await client.from('profiles').select('id, avatar_url').eq('id', user.id).maybeSingle()
  if (profile.error) throw new Error(profile.error.message)
  if (!profile.data) {
    const inserted = await client.from('profiles').insert({
      id: user.id,
      display_name: displayName,
      avatar_id: 'avatar_01',
      avatar_url: googleAvatarUrl,
      daily_goal: 10,
    })
    if (inserted.error && inserted.error.code !== '23505') throw new Error(inserted.error.message)
  } else if (googleAvatarUrl && !profile.data.avatar_url?.trim()) {
    const updated = await client.from('profiles').update({ avatar_url: googleAvatarUrl }).eq('id', user.id)
    if (updated.error) throw new Error(updated.error.message)
  }

  const provisioned = await fetch('/api/provision-user', { method: 'POST' })
  if (!provisioned.ok) throw new Error('Could not provision the account statistics.')
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: Client) {}

  async getSession(): Promise<AuthUser | null> {
    const result = await this.client.auth.getUser()
    if (result.error) {
      if (result.error.name === 'AuthSessionMissingError' || result.error.code === 'AuthSessionMissingError') return null
      throw toAuthError(result.error, 'We could not verify your session.')
    }
    if (!result.data.user) return null
    const user = result.data.user
    if (user.email_confirmed_at) await provisionUserRows(this.client, user)
    return toAuthUser(user)
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toAuthUser(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const result = await this.client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { display_name: input.display_name.trim() },
        emailRedirectTo: `${getPublicSiteUrl()}/auth/confirm?next=/auth/verified`,
      },
    })
    if (result.error) throw toAuthError(result.error, 'We could not create your account.')
    if (!result.data.user) throw toAuthError(new Error('Missing user after signup.'), 'We could not create your account.')
    if (result.data.user.identities?.length === 0) {
      throw new AuthError('email_taken', 'An account with this email already exists.')
    }
    if (result.data.session) await provisionUserRows(this.client, result.data.user, input.display_name)
    return {
      user: toAuthUser(result.data.user),
      needsConfirmation: !result.data.session,
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const result = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) throw toAuthError(result.error, 'We could not sign you in.')
    if (!result.data.user) throw toAuthError(new Error('Missing user after sign-in.'), 'We could not sign you in.')
    await provisionUserRows(this.client, result.data.user)
    return toAuthUser(result.data.user)
  }

  async signInWithGoogle(): Promise<void> {
    const result = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getPublicSiteUrl()}/auth/confirm?next=/dashboard&flow=google`,
      },
    })
    if (result.error) throw toAuthError(result.error, 'We could not start Google sign-in.')
  }

  async signOut(): Promise<void> {
    const result = await this.client.auth.signOut()
    if (result.error) throw toAuthError(result.error, 'We could not sign you out.')
  }

  async resendConfirmation(email: string): Promise<{ confirmationToken?: string }> {
    const result = await this.client.auth.resend({ type: 'signup', email: email.trim() })
    if (result.error) throw toAuthError(result.error, 'We could not resend the confirmation email.')
    return {}
  }

  async confirmEmail(token: string): Promise<AuthUser> {
    const result = await this.client.auth.verifyOtp({ type: 'email', token_hash: token })
    if (result.error) throw toAuthError(result.error, 'That confirmation link is invalid or expired.')
    if (!result.data.user) throw toAuthError(new Error('Missing user after confirmation.'), 'That confirmation link is invalid or expired.')
    await provisionUserRows(this.client, result.data.user)
    return toAuthUser(result.data.user)
  }

  async requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
    const result = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getPublicSiteUrl()}/auth/confirm?next=/auth/reset-password`,
    })
    if (result.error) throw toAuthError(result.error, 'We could not send the reset link.')
    return {}
  }

  async resetPassword(_token: string, newPassword: string): Promise<void> {
    const result = await this.client.auth.updateUser({ password: newPassword })
    if (result.error) throw toAuthError(result.error, 'We could not update your password.')
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const current = await this.client.auth.getUser()
    if (current.error || !current.data.user?.email) throw toAuthError(current.error ?? new Error('No session.'), 'Your session has expired.')
    const verified = await this.client.auth.signInWithPassword({ email: current.data.user.email, password: currentPassword })
    if (verified.error) throw toAuthError(verified.error, 'Your current password is incorrect.')
    const result = await this.client.auth.updateUser({ password: newPassword })
    if (result.error) throw toAuthError(result.error, 'We could not update your password.')
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch('/api/account', { method: 'DELETE' })
    if (!response.ok) throw toAuthError(new Error('Account deletion failed.'), 'We could not delete your account.')
    await this.signOut()
  }
}

export { provisionUserRows }
