'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AuthShell } from './auth-shell'
import { useAuth } from './auth-provider'
import { safeNext } from '@/lib/safe-redirect'

export function CheckEmailView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resendConfirmation } = useAuth()

  const email = searchParams.get('email') ?? ''
  const next = safeNext(searchParams.get('next'))
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [resending, setResending] = useState(false)

  function openConfirmationLink() {
    // Simulates clicking the link inside the confirmation email.
    const params = new URLSearchParams({ token })
    if (next !== '/dashboard') params.set('next', next)
    router.push(`/auth/verified?${params.toString()}`)
  }

  async function resend() {
    if (!email) return
    setResending(true)
    try {
      const res = await resendConfirmation(email)
      if (res.confirmationToken) setToken(res.confirmationToken)
      toast({ title: 'Confirmation email resent', tone: 'success' })
    } catch {
      toast({ title: 'Could not resend right now.', tone: 'error' })
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        email
          ? `We sent a confirmation link to ${email}. Click it to activate your account.`
          : 'We sent you a confirmation link. Click it to activate your account.'
      }
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
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <MailCheck className="size-6" aria-hidden />
          </span>
        </div>

        {token ? (
          <div className="rounded-md border-2 border-dashed border-foreground/40 bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Local mode: no real email is sent. Use the button below to open the
              confirmation link.
            </p>
            <Button
              type="button"
              variant="accent"
              size="block"
              className="mt-3"
              onClick={openConfirmationLink}
            >
              Open confirmation link
            </Button>
          </div>
        ) : null}

        <Button type="button" variant="outline" size="block" loading={resending} onClick={resend}>
          Resend email
        </Button>
      </div>
    </AuthShell>
  )
}
