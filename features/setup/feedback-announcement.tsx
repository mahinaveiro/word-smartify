'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const FEEDBACK_ANNOUNCEMENT_KEY = 'word-smartify:feedback-announcement-seen'

function storageKey(userId: string) {
  return `${FEEDBACK_ANNOUNCEMENT_KEY}:${userId}`
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
    // Storage may be unavailable in private browsing; the modal still dismisses for this mount.
  }
}

export function FeedbackAnnouncement({
  enabled,
  userId,
  onDone,
}: {
  enabled: boolean
  userId: string
  onDone: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const finish = useCallback((goToFeedback = false) => {
    setOpen(false)
    markSeen(userId)
    onDone()
    if (goToFeedback) router.push('/settings/feedback')
  }, [onDone, router, userId])

  useEffect(() => {
    if (!enabled) return
    if (hasSeen(userId)) {
      onDone()
      return
    }

    markSeen(userId)
    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [enabled, onDone, userId])

  return (
    <Modal
      open={open}
      onClose={() => finish()}
      title="New: Help & feedback"
      description="Tell us what would make studying with Word Smartify better."
      footer={(
        <>
          <Button variant="ghost" onClick={() => finish()}>Got it</Button>
          <Button onClick={() => finish(true)}>
            Try now
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid size-11 place-items-center rounded-md border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
          <MessageSquare className="size-5" aria-hidden />
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Found a problem, have an idea, or want to ask something about Word Smartify?
          </p>
          <p>
            You can now send feedback from <strong className="text-foreground">Settings → Help & feedback</strong>. You can choose the affected page and attach a screenshot when useful.
          </p>
          <p className="font-medium text-foreground">
            Please tell us what you think. Every suggestion and honest criticism is welcome.
          </p>
        </div>
      </div>
    </Modal>
  )
}
