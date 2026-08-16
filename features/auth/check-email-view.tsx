'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
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
  const [resending, setResending] = useState(false)

  async function resend() {
    if (!email) return
    setResending(true)
    try {
      await resendConfirmation(email)
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
        <BackButton onClick={() => router.push(`/auth?next=${encodeURIComponent(next)}`)} />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <MailCheck className="size-6" aria-hidden />
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          The link will open Word Smartify and finish activating your account securely.
        </p>
        <Button type="button" variant="outline" size="block" loading={resending} onClick={resend}>
          Resend email
        </Button>
      </div>
    </AuthShell>
  )
}
