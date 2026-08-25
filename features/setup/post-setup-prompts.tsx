'use client'

import { useCallback, useState } from 'react'
import { CookieConsent } from '@/features/setup/cookie-consent'
import { InstallPrompt } from '@/features/setup/install-prompt'
import { StudyGcPrompt } from '@/features/setup/study-gc-prompt'
import { BadgeCongratulationsModal } from '@/features/badges/badge-congratulations-modal'
import { FeedbackAnnouncement } from '@/features/setup/feedback-announcement'
import { ProfilePictureAnnouncement } from '@/features/setup/profile-picture-announcement'
import { usePendingBadgeAwards } from '@/hooks/use-data'

export function PostSetupPrompts({ userId, joined }: { userId: string; joined: boolean }) {
  const [stage, setStage] = useState<'telegram' | 'install' | 'cookies' | 'badges' | 'feedback' | 'profile-picture' | 'done'>('telegram')
  const pendingAwardsQuery = usePendingBadgeAwards()

  const finishTelegram = useCallback(() => setStage('install'), [])
  const finishInstall = useCallback(() => setStage('cookies'), [])
  const finishCookies = useCallback(() => setStage('badges'), [])
  const finishBadges = useCallback(() => setStage('feedback'), [])
  const finishFeedback = useCallback(() => setStage('profile-picture'), [])
  const finishProfilePicture = useCallback(() => setStage('done'), [])

  return (
    <>
      <StudyGcPrompt userId={userId} joined={joined} onDone={finishTelegram} />
      <InstallPrompt enabled={stage === 'install'} onDone={finishInstall} />
      <CookieConsent enabled={stage === 'cookies'} onDone={finishCookies} />
      <BadgeCongratulationsModal
        enabled={stage === 'badges'}
        awards={pendingAwardsQuery.data ?? []}
        isLoading={pendingAwardsQuery.isLoading}
        onDone={finishBadges}
      />
      <FeedbackAnnouncement enabled={stage === 'feedback'} userId={userId} onDone={finishFeedback} />
      <ProfilePictureAnnouncement enabled={stage === 'profile-picture'} userId={userId} onDone={finishProfilePicture} />
    </>
  )
}
