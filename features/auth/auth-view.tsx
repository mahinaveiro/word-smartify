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

type Mode = 'signin' | 'signup'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.39Z" />
      <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.02H3.29v2.5A9.74 9.74 0 0 0 12 21.6Z" />
      <path fill="#FBBC05" d="M6.54 12.8a5.86 5.86 0 0 1 0-3.6V6.7H3.29a9.7 9.7 0 0 0 0 8.6l3.25-2.5Z" />
      <path fill="#EA4335" d="M12 5.18c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 2.25 14.63 1.4 12 1.4a9.74 9.74 0 0 0-8.71 5.3l3.25 2.5C7.31 6.9 9.46 5.18 12 5.18Z" />
    </svg>
  )
}

export function AuthView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { signIn, signInWithGoogle, signUp } = useAuth()

  const next = safeNext(searchParams.get('next'))
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  function switchMode(m: Mode) {
    setMode(m)
    setErrors({})
    setPassword('')
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      handleError(err)
      setGoogleLoading(false)
    }
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
        await signUp({ display_name: name.trim(), email: email.trim(), password })
        const params = new URLSearchParams({ email: email.trim() })
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
    toast({ title: 'Sign in could not be completed. Please try again.', tone: 'error' })
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
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="block"
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading || googleLoading}
        >
          <GoogleMark />
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
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
      </AuthShell>
  )
}
