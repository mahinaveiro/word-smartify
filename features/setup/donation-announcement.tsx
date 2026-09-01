'use client'

import Image from 'next/image'
import { createPortal } from 'react-dom'
import { type CSSProperties, useCallback, useEffect, useState } from 'react'
import { Check, Copy, HeartHandshake, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const DONATION_ANNOUNCEMENT_KEY = 'word-smartify:donation-support-seen'
const PAYMENT_NUMBER = '01840862048'
const CONFETTI_PIECES = [
  ['-120px', '170px', '-42deg', '0ms'],
  ['-92px', '230px', '28deg', '60ms'],
  ['-54px', '145px', '62deg', '110ms'],
  ['-18px', '250px', '-20deg', '40ms'],
  ['18px', '210px', '38deg', '90ms'],
  ['56px', '155px', '-54deg', '150ms'],
  ['94px', '235px', '18deg', '10ms'],
  ['126px', '175px', '72deg', '130ms'],
  ['-145px', '105px', '12deg', '180ms'],
  ['145px', '115px', '-28deg', '80ms'],
] as const

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

function MailPreview({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-md border-2 border-foreground/15 bg-background p-2 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label="Open the hosting usage email"
    >
      <Image
        src="/images/mail.jpg"
        alt="A hosting usage email about Word Smartify’s growing usage"
        width={1296}
        height={832}
        className="h-auto max-h-40 w-full rounded object-contain sm:max-h-52"
        priority
      />
      <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-md bg-foreground/85 px-3 py-2 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <ImageIcon className="size-3.5" aria-hidden />
        Tap to view clearly
      </span>
    </button>
  )
}

function MailViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label="Close the hosting usage email"
      className="fixed inset-0 z-[200] h-[100dvh] w-screen cursor-zoom-out bg-black"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClose()
      }}
    >
      <Image
        src="/images/mail.jpg"
        alt="A hosting usage email about Word Smartify’s growing usage"
        fill
        sizes="100vw"
        className="object-contain"
        priority
      />
    </div>,
    document.body,
  )
}

function Celebration({ amount }: { amount: number }) {
  const progress = Math.min(100, Math.max(8, amount))

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-primary/30 bg-primary/10 px-4 py-8 text-center">
      {CONFETTI_PIECES.map(([x, y, rotate, delay], index) => {
        const style = {
          '--confetti-x': x,
          '--confetti-y': y,
          '--confetti-rotate': rotate,
          '--confetti-duration': '1400ms',
          '--confetti-delay': delay,
          left: `${50 + ((index % 3) - 1) * 4}%`,
          top: '44%',
        } as CSSProperties
        return <span key={`${x}-${y}`} className="quiz-confetti-piece" style={style} aria-hidden />
      })}
      <HeartHandshake className="mx-auto size-10 text-primary" aria-hidden />
      <h3 className="mt-3 font-heading text-xl font-bold text-foreground">Thank you for helping me</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Your support means a lot and helps keep this student-built platform alive for everyone.
      </p>
      <div className="mx-auto mt-5 max-w-xs text-left">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Your support</span>
          <span>৳{amount.toLocaleString('en-BD')}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background/80" role="progressbar" aria-label="Your support contribution" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
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
  const [view, setView] = useState<'intro' | 'details' | 'follow-up' | 'amount' | 'thanks' | null>(null)
  const [imageOpen, setImageOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState<'payment' | 'uid' | null>(null)

  const finish = useCallback(() => {
    markSeen(userId)
    setView(null)
    onDone()
  }, [onDone, userId])

  const defer = useCallback(() => {
    setView(null)
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

  const submitAmount = useCallback(() => {
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setView('thanks')
  }, [amount])

  useEffect(() => {
    if (!enabled) return
    if (hasSeen(userId)) {
      onDone()
      return
    }

    const timer = window.setTimeout(() => setView('intro'), 0)
    return () => window.clearTimeout(timer)
  }, [enabled, onDone, userId])

  if (!view) return null

  if (view === 'intro') {
    return (
      <>
        <Modal
          open
          onClose={() => undefined}
          dismissible={false}
          title="Help keep Word Smartify alive"
          description="Please read this short message before continuing."
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
          footer={(
            <Button onClick={() => setView('details')} className="w-full sm:w-auto">
              Read the message
              <HeartHandshake className="size-4" aria-hidden />
            </Button>
          )}
        >
          <div className="space-y-4">
            <MailPreview onOpen={() => setImageOpen(true)} />
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Word Smartify was built by a student for students, and I&apos;m trying to keep it free for everyone.</p>
              <p className="font-medium text-foreground">If you find this website useful, even a small contribution can help keep it online.</p>
            </div>
          </div>
        </Modal>
        <MailViewer open={imageOpen} onClose={() => setImageOpen(false)} />
      </>
    )
  }

  if (view === 'details') {
    return (
      <>
        <Modal
          open
          onClose={() => undefined}
          dismissible={false}
          title="This is our app"
          description="A student-built platform for students."
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
          footer={(
            <Button onClick={() => setView('follow-up')} className="w-full sm:w-auto">
              Got it
              <HeartHandshake className="size-4" aria-hidden />
            </Button>
          )}
        >
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <MailPreview onOpen={() => setImageOpen(true)} />
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
                <p className="mt-1 text-sm text-foreground">Send money to this number through bKash Personal or Nagad:</p>
              </div>
              <CopyField
                label="Send money to"
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
        <MailViewer open={imageOpen} onClose={() => setImageOpen(false)} />
      </>
    )
  }

  if (view === 'follow-up') {
    return (
      <Modal
        open
        onClose={defer}
        title="Did you donate?"
        description="Thank you for supporting Word Smartify if you were able to help."
        footer={(
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={defer}>Later</Button>
            <Button type="button" onClick={() => setView('amount')}>Yes, I donated</Button>
          </div>
        )}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you donated, you can optionally share the amount so I can understand how the community is helping. This is a self-reported amount and does not verify a payment.
        </p>
      </Modal>
    )
  }

  if (view === 'amount') {
    const parsedAmount = Number(amount)
    const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
    return (
      <Modal
        open
        onClose={defer}
        title="How much did you donate?"
        description="This is optional and only used for the thank-you animation."
        footer={(
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={defer}>Later</Button>
            <Button type="button" onClick={submitAmount} disabled={!validAmount}>Continue</Button>
          </div>
        )}
      >
        <label htmlFor="donation-amount" className="text-sm font-semibold text-foreground">Amount in taka</label>
        <div className="mt-2 flex items-center rounded-md border-2 border-foreground/15 bg-background/70 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="text-base font-semibold text-muted-foreground" aria-hidden>৳</span>
          <input
            id="donation-amount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base font-semibold text-foreground outline-none"
            placeholder="50"
            autoFocus
          />
        </div>
      </Modal>
    )
  }

  const numericAmount = Number(amount)
  return (
    <Modal
      open
      onClose={finish}
      title="Thank you"
      description="Your support means a lot."
      className="max-w-md"
      footer={(
        <Button type="button" onClick={finish} className="w-full sm:w-auto">Continue</Button>
      )}
    >
      <Celebration amount={numericAmount} />
    </Modal>
  )
}
