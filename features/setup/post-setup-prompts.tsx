'use client'

import { useCallback, useEffect, useState } from 'react'
import { CookieConsent } from '@/features/setup/cookie-consent'
import { InstallPrompt } from '@/features/setup/install-prompt'
import { StudyGcPrompt } from '@/features/setup/study-gc-prompt'
import { BadgeCongratulationsModal } from '@/features/badges/badge-congratulations-modal'
import { usePendingBadgeAwards } from '@/hooks/use-data'
import { createDisplayBadge } from '@/lib/badges'
import { isOwnerUserId, OWNER_USER_ID } from '@/lib/owner'
import type { PendingBadgeAward } from '@/types/database'

const OWNER_TASNIM_PREVIEW_SEEN_KEY = 'word-smartify:owner-tasnim-demo-seen'
const OWNER_TASNIM_PREVIEW_AWARD_ID = '00000000-0000-0000-0000-000000000001'
const OWNER_TASNIM_PREVIEW_AWARDED_AT = '2026-08-23T00:00:00.000Z'

const ownerTasnimPreviewAward: PendingBadgeAward = (() => {
  const display = createDisplayBadge('contributor-tasnim', {
    awardId: OWNER_TASNIM_PREVIEW_AWARD_ID,
    awardedAt: OWNER_TASNIM_PREVIEW_AWARDED_AT,
  })

  if (!display) throw new Error('The temporary Tasnim preview badge definition is missing.')

  return {
    id: OWNER_TASNIM_PREVIEW_AWARD_ID,
    user_id: OWNER_USER_ID,
    badge_key: 'contributor-tasnim',
    award_kind: 'permanent',
    week_start: null,
    week_end: null,
    placement: null,
    awarded_at: OWNER_TASNIM_PREVIEW_AWARDED_AT,
    acknowledged_at: null,
    display,
  }
})()

function ownerTasnimPreviewKey(userId: string) {
  return `${OWNER_TASNIM_PREVIEW_SEEN_KEY}:${userId}`
}

export function PostSetupPrompts({ userId, joined }: { userId: string; joined: boolean }) {
  const [stage, setStage] = useState<'checking' | 'telegram' | 'install' | 'cookies' | 'badges' | 'owner-demo' | 'done'>('checking')
  const pendingAwardsQuery = usePendingBadgeAwards()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isOwnerUserId(userId)) {
        setStage('telegram')
        return
      }

      let alreadySeen = false
      try {
        alreadySeen = window.localStorage.getItem(ownerTasnimPreviewKey(userId)) === '1'
      } catch {
        alreadySeen = false
      }

      setStage(alreadySeen ? 'telegram' : 'owner-demo')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [userId])

  const finishTelegram = useCallback(() => setStage('install'), [])
  const finishInstall = useCallback(() => setStage('cookies'), [])
  const finishCookies = useCallback(() => setStage('badges'), [])
  const finishBadges = useCallback(() => setStage('done'), [])
  const finishOwnerDemo = useCallback(() => {
    try {
      window.localStorage.setItem(ownerTasnimPreviewKey(userId), '1')
    } catch {
      // The modal can still finish if storage is unavailable.
    }
    setStage('done')
  }, [userId])

  const ownerDemo = stage === 'owner-demo'
  const realPendingAwards = pendingAwardsQuery.data ?? []
  const awards = ownerDemo ? [ownerTasnimPreviewAward] : realPendingAwards

  return (
    <>
      <StudyGcPrompt enabled={stage === 'telegram'} userId={userId} joined={joined} onDone={finishTelegram} />
      <InstallPrompt enabled={stage === 'install'} onDone={finishInstall} />
      <CookieConsent enabled={stage === 'cookies'} onDone={finishCookies} />
      <BadgeCongratulationsModal
        enabled={stage === 'badges' || stage === 'owner-demo'}
        awards={awards}
        isLoading={ownerDemo ? false : pendingAwardsQuery.isLoading}
        skipAcknowledgement={ownerDemo}
        onDone={ownerDemo ? finishOwnerDemo : finishBadges}
      />
    </>
  )
}
