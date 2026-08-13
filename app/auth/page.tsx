'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Wordmark } from '@/components/shell/wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // No real authentication in local mode — go straight to the app.
    setTimeout(() => router.push('/dashboard'), 300)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>

        <div className="rounded-[--radius-lg] border-2 border-foreground bg-card p-6 shadow-brutal-lg">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-[--radius-md] border-2 border-foreground bg-muted p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  'rounded-[--radius-sm] px-3 py-2 text-sm font-semibold transition-colors ' +
                  (mode === m ? 'border-2 border-foreground bg-card' : 'text-muted-foreground')
                }
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' ? (
              <Input label="Name" name="name" placeholder="Your name" autoComplete="name" />
            ) : null}
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
            <Button type="submit" size="block" loading={loading}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </Button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Authentication is disabled in local mode. Any details take you to the app.
          </p>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/dashboard" className="font-semibold underline underline-offset-4">
            Skip and explore
          </Link>
        </p>
      </div>
    </div>
  )
}
