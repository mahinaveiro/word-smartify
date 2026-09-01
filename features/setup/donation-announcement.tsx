'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const DONATION_ANNOUNCEMENT_KEY = 'word-smartify:donation-support-seen'
const PAYMENT_NUMBER = '01840862048'

function storageKey(userId: string) {
  return `${DONATION_ANNOUNCEMENT_KEY}:${userId}`
}

function hasSeen(userId: string) {
  try {
    return window.localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

function markSeen(userId: string) {
  try {
    window.localStorage.setItem(storageKey(userId), '1')
  } catch {
    // The current mount still completes if browser storage is unavailable.
  }
}

function CopyField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border-2 border-foreground/15 bg-background/70 p-2">
        <code className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-foreground">{value}</code>
        <Button type="button" variant="outline" size="sm" onClick={onCopy} aria-label={`Copy ${label.toLowerCase()}`}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          <span className="sr-only">{copied ? 'Copied' : `Copy ${label.toLowerCase()}`}</span>
          <span aria-hidden>{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
    </div>
  )
}

export function DonationAnnouncement({
  enabled,
  userId,
  onDone,
}: {
  enabled: boolean
  userId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [copied, setCopied] = useState<'payment' | 'uid' | null>(null)

  const finish = useCallback(() => {
    setDetailsOpen(false)
    setOpen(false)
    markSeen(userId)
    onDone()
  }, [onDone, userId])

  const close = useCallback(() => {
    setDetailsOpen(false)
    setOpen(false)
    onDone()
  }, [onDone])

  const copyValue = useCallback(async (kind: 'payment' | 'uid', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600)
    } catch {
      setCopied(null)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (hasSeen(userId)) {
      onDone()
      return
    }

    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [enabled, onDone, userId])

  if (!open) return null

  if (detailsOpen) {
    return (
      <Modal
        open
        onClose={close}
        title="This is our app"
        description="A student-built platform for students."
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        footer={(
          <Button onClick={finish} className="w-full sm:w-auto">
            Got it
            <HeartHandshake className="size-4" aria-hidden />
          </Button>
        )}
      >
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div className="overflow-hidden rounded-md border-2 border-foreground/15 bg-background p-2">
            <Image
              src="/images/mail.jpg"
              alt="A hosting usage email about Word Smartify’s growing usage"
              width={1296}
              height={832}
              className="h-auto max-h-52 w-full rounded object-contain sm:max-h-64"
              priority
            />
          </div>
          <div className="space-y-3">
            <p>
              I&apos;m a student just like many of you, and I built <strong className="text-foreground">Word Smartify</strong> to make vocabulary preparation easier and more accessible for students like us.
            </p>
            <p>
              More than <strong className="text-foreground">150 learners</strong> are already using it, and I genuinely want to keep improving it. But I <strong className="text-foreground">don&apos;t earn anything from this website</strong>, and I can&apos;t keep covering hosting and other costs out of my own pocket forever.
            </p>
            <p>
              If everyone who can help contributes even <strong className="text-foreground">৳50</strong>, it would make a real difference. It can help cover the running costs, work toward a proper domain like <strong className="text-foreground">word-smartify.com</strong>, and keep the platform available for everyone.
            </p>
            <p>
              <strong className="text-foreground">You don&apos;t have to donate to use Word Smartify, but without enough support, I may eventually have to shut it down.</strong> If it has helped you even a little, your support would genuinely mean a lot.
            </p>
            <p>
              And if you can&apos;t contribute financially, <strong className="text-foreground">sharing Word Smartify with other students or giving useful feedback still helps.</strong>
            </p>
            <p className="font-medium text-foreground">
              <strong>This isn&apos;t a business. It&apos;s a student-built platform for students, and I&apos;m doing my best to keep it alive for all of us.</strong>
            </p>
          </div>
          <div className="space-y-3 rounded-md border-2 border-foreground/15 bg-background/60 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support details</p>
              <p className="mt-1 text-sm text-foreground">bKash Personal · Nagad</p>
            </div>
            <CopyField
              label="Payment number"
              value={PAYMENT_NUMBER}
              copied={copied === 'payment'}
              onCopy={() => copyValue('payment', PAYMENT_NUMBER)}
            />
            <div className="space-y-1.5 border-t border-foreground/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference UID</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                If you donate, paste this UID into the bKash or Nagad reference field so I can match the contribution to your Word Smartify account.
              </p>
              <CopyField
                label="Your account UID"
                value={userId}
                copied={copied === 'uid'}
                onCopy={() => copyValue('uid', userId)}
              />
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={close}
      title="Help keep Word Smartify alive"
      description="A small community contribution can make a real difference."
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="ghost" onClick={close}>Maybe later</Button>
          <Button onClick={() => setDetailsOpen(true)}>
            Read more
            <HeartHandshake className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border-2 border-foreground/15 bg-background p-2">
          <Image
            src="/images/mail.jpg"
            alt="A hosting usage email about Word Smartify’s growing usage"
            width={1296}
            height={832}
            className="h-auto max-h-40 w-full rounded object-contain sm:max-h-52"
            priority
          />
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Word Smartify was built by a student for students, and I&apos;m trying to keep it free for everyone. Hosting and domain costs are becoming difficult to manage alone.
          </p>
          <p className="font-medium text-foreground">
            If you find this website useful, even a small contribution can help keep it online and improve it for all of us.
          </p>
        </div>
      </div>
    </Modal>
  )
}
