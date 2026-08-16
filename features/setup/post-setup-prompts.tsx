'use client'

import { useCallback, useState } from 'react'
import { CookieConsent } from '@/features/setup/cookie-consent'
import { InstallPrompt } from '@/features/setup/install-prompt'
import { StudyGcPrompt } from '@/features/setup/study-gc-prompt'

export function PostSetupPrompts({ userId, joined }: { userId: string; joined: boolean }) {
  const [stage, setStage] = useState<'telegram' | 'install' | 'cookies'>('telegram')

  const finishTelegram = useCallback(() => setStage('install'), [])
  const finishInstall = useCallback(() => setStage('cookies'), [])

  return (
    <>
      <StudyGcPrompt userId={userId} joined={joined} onDone={finishTelegram} />
      <InstallPrompt enabled={stage === 'install'} onDone={finishInstall} />
      <CookieConsent enabled={stage === 'cookies'} />
    </>
  )
}
