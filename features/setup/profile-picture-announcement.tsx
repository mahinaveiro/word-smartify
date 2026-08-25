'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const PROFILE_PICTURE_ANNOUNCEMENT_KEY = 'word-smartify:profile-picture-announcement-seen'

function storageKey(userId: string) {
  return `${PROFILE_PICTURE_ANNOUNCEMENT_KEY}:${userId}`
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

export function ProfilePictureAnnouncement({
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

  const finish = useCallback((goToProfileSettings = false) => {
    setOpen(false)
    markSeen(userId)
    onDone()
    if (goToProfileSettings) router.push('/settings/profile')
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
      title="New: Profile pictures"
      description="Make your Word Smartify profile easier to recognize."
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
          <Camera className="size-5" aria-hidden />
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            You can now change your profile picture from <strong className="text-foreground">Settings → Profile settings</strong>.
          </p>
          <p>
            Upload a photo, crop it to fit, and use it across your profile and leaderboard presence.
          </p>
        </div>
      </div>
    </Modal>
  )
}
