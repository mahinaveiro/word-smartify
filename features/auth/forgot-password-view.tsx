'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { AuthShell } from './auth-shell'
import { useAuth } from './auth-provider'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordView() {
  const router = useRouter()
  const { requestPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailRe.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      setError("We couldn't send the reset link. Your email is unchanged. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email.trim()}, we've sent a link to reset your password.`}
        footer={
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="font-semibold underline underline-offset-4"
          >
            Back to sign in
          </button>
        }
      >
        <p className="text-center text-sm text-muted-foreground">
          The link will open Word Smartify and securely start a password-reset session.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <button
          type="button"
          onClick={() => router.push('/auth')}
          className="font-semibold underline underline-offset-4"
        >
          Back to sign in
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="email" error={error}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Button type="submit" size="block" loading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  )
}
