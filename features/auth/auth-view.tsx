'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { AuthShell } from './auth-shell'
import { PasswordField } from './password-field'
import { PasswordChecklist } from './password-checklist'
import { useAuth } from './auth-provider'
import { checkPassword } from '@/lib/password'
import { safeNext } from '@/lib/safe-redirect'
import { isAuthError } from '@/types/auth'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/auth/demo-account'

type Mode = 'signin' | 'signup'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { signIn, signUp } = useAuth()

  const next = safeNext(searchParams.get('next'))
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  function switchMode(m: Mode) {
    setMode(m)
    setErrors({})
    setPassword('')
  }

  function useDemo() {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setErrors({})
  }

  function validate() {
    const errs: typeof errors = {}
    if (mode === 'signup' && name.trim().length < 2) errs.name = 'Enter your name.'
    if (!emailRe.test(email.trim())) errs.email = 'Enter a valid email address.'
    if (mode === 'signin') {
      if (!password) errs.password = 'Enter your password.'
    } else if (!checkPassword(password).valid) {
      errs.password = 'Password does not meet the requirements below.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        toast({ title: 'Welcome back!', tone: 'success' })
        router.replace(next)
      } else {
        const res = await signUp({ display_name: name.trim(), email: email.trim(), password })
        const params = new URLSearchParams({ email: email.trim() })
        // Local mode surfaces the token so the flow is testable without email.
        if (res.confirmationToken) params.set('token', res.confirmationToken)
        if (next !== '/dashboard') params.set('next', next)
        router.push(`/auth/check-email?${params.toString()}`)
      }
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  function handleError(err: unknown) {
    if (isAuthError(err)) {
      switch (err.code) {
        case 'invalid_credentials':
          setErrors({ password: 'Incorrect email or password.' })
          return
        case 'email_not_confirmed':
          toast({
            title: 'Confirm your email',
            description: 'Check your inbox for the confirmation link.',
            tone: 'error',
          })
          router.push(`/auth/check-email?email=${encodeURIComponent(email.trim())}`)
          return
        case 'email_taken':
          setErrors({ email: 'An account with this email already exists.' })
          return
        default:
          toast({ title: err.message, tone: 'error' })
          return
      }
    }
    toast({ title: 'Something went wrong. Please try again.', tone: 'error' })
  }

  return (
    <AuthShell
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      subtitle={
        mode === 'signin'
          ? 'Sign in to keep building your streak.'
          : 'Start mastering 1,888 words — it only takes a minute.'
      }
      footer={
        mode === 'signin' ? (
          <span>
            New here?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="font-semibold underline underline-offset-4"
            >
              Create an account
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="font-semibold underline underline-offset-4"
            >
              Sign in
            </button>
          </span>
        )
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {mode === 'signup' ? (
          <Field label="Name" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
          </Field>
        ) : null}

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
          />
        </Field>

        <div>
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            error={errors.password}
          />
          {mode === 'signup' ? <PasswordChecklist value={password} /> : null}
        </div>

        {mode === 'signin' ? (
          <div className="-mt-1 text-right">
            <button
              type="button"
              onClick={() => router.push('/auth/forgot-password')}
              className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <Button type="submit" size="block" loading={loading}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
          <ArrowRight className="size-4" strokeWidth={2.25} />
        </Button>
      </form>

      {mode === 'signin' ? (
        <div className="mt-4 rounded-md border-2 border-dashed border-foreground/40 bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Want to look around first?{' '}
            <button
              type="button"
              onClick={useDemo}
              className="font-semibold text-foreground underline underline-offset-4"
            >
              Use the demo account
            </button>
          </p>
        </div>
      ) : null}
    </AuthShell>
  )
}
