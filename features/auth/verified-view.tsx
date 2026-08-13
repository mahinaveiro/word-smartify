'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthShell } from './auth-shell'
import { useAuth } from './auth-provider'
import { safeNext } from '@/lib/safe-redirect'

export function VerifiedView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirmEmail } = useAuth()

  const token = searchParams.get('token') ?? ''
  const next = safeNext(searchParams.get('next'))
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus('error')
      return
    }
    confirmEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token, confirmEmail])

  if (status === 'verifying') {
    return <AuthShell title="Confirming your email…" subtitle="One moment." children={<div className="h-2" />} />
  }

  if (status === 'error') {
    return (
      <AuthShell
        title="Link expired or invalid"
        subtitle="This confirmation link is no longer valid. Sign in to request a new one."
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
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-coral text-coral-foreground shadow-brutal-sm">
            <AlertTriangle className="size-6" aria-hidden />
          </span>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Email confirmed!"
      subtitle="Your account is ready. Let's build your first streak."
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <CheckCircle2 className="size-6" aria-hidden />
          </span>
        </div>
        <Button type="button" size="block" onClick={() => router.replace(next)}>
          Continue to dashboard
        </Button>
      </div>
    </AuthShell>
  )
}
