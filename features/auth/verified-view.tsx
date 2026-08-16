'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { AuthShell } from './auth-shell'
import { useAuth } from './auth-provider'
import { safeNext } from '@/lib/safe-redirect'

export function VerifiedView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, refresh } = useAuth()
  const next = safeNext(searchParams.get('next'))
  const invalidLink = searchParams.get('error') === 'invalid-link'
  const [refreshComplete, setRefreshComplete] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || loading || invalidLink || user?.email_confirmed) return
    ran.current = true
    refresh()
      .then(() => setRefreshComplete(true))
      .catch(() => setRefreshFailed(true))
  }, [invalidLink, loading, refresh, user?.email_confirmed])

  const status = invalidLink || refreshFailed
    ? 'error'
    : user?.email_confirmed || refreshComplete
      ? 'success'
      : 'verifying'

  if (status === 'verifying') {
    return (
      <AuthShell title="Confirming your email…" subtitle="One moment.">
        <div className="h-2" />
      </AuthShell>
    )
  }

  if (status === 'error') {
    return (
      <AuthShell
        title="Link expired or invalid"
        subtitle="This confirmation link is no longer valid. Sign in to request a new one."
        footer={
          <BackButton onClick={() => router.push('/auth')} />
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
    <AuthShell title="Email confirmed!" subtitle="Your account is ready. Let's build your first streak.">
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
