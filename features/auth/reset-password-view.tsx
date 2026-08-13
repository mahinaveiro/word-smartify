'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AuthShell } from './auth-shell'
import { PasswordField } from './password-field'
import { PasswordChecklist } from './password-checklist'
import { useAuth } from './auth-provider'
import { checkPassword } from '@/lib/password'
import { isAuthError } from '@/types/auth'

export function ResetPasswordView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resetPassword } = useAuth()

  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading] = useState(false)

  const missingToken = token.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!checkPassword(password).valid) errs.password = 'Password does not meet the requirements below.'
    if (confirm !== password) errs.confirm = 'Passwords do not match.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await resetPassword(token, password)
      toast({ title: 'Password updated', description: 'Sign in with your new password.', tone: 'success' })
      router.replace('/auth')
    } catch (err) {
      if (isAuthError(err) && err.code === 'invalid_token') {
        setErrors({ password: 'This reset link has expired. Request a new one.' })
      } else {
        toast({ title: 'Could not reset password. Try again.', tone: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (missingToken) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="This link is missing or malformed. Request a new one to continue."
        footer={
          <button
            type="button"
            onClick={() => router.push('/auth/forgot-password')}
            className="font-semibold underline underline-offset-4"
          >
            Request a new link
          </button>
        }
      >
        <div className="h-2" />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it strong and memorable.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <PasswordField
            id="password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={errors.password}
          />
          <PasswordChecklist value={password} />
        </div>
        <PasswordField
          id="confirm"
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
        />
        <Button type="submit" size="block" loading={loading}>
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
