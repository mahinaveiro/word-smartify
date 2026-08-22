'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const COOKIE_CONSENT_KEY = 'word-smartify:cookie-consent'
const COOKIE_NAME = 'word-smartify-cookie-consent'

function hasConsent() {
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted'
  } catch {
    return document.cookie.split('; ').some((cookie) => cookie.startsWith(`${COOKIE_NAME}=accepted`))
  }
}

function saveConsent() {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
  } catch {
    // The cookie below is the fallback when storage is unavailable.
  }
  document.cookie = `${COOKIE_NAME}=accepted; Max-Age=31536000; Path=/; SameSite=Lax`
}

export function CookieConsent({ enabled, onDone }: { enabled: boolean; onDone?: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (hasConsent()) {
      onDone?.()
      return
    }
    const timer = window.setTimeout(() => setVisible(true), 700)
    return () => window.clearTimeout(timer)
  }, [enabled, onDone])

  const accept = useCallback(() => {
    saveConsent()
    setVisible(false)
    onDone?.()
  }, [onDone])

  if (!visible) return null

  return (
    <aside
      role="dialog"
      aria-label="Cookie consent"
      className="cookie-consent-enter fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl rounded-lg border-2 border-foreground bg-card p-4 shadow-brutal sm:inset-x-auto sm:bottom-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use essential cookies to keep Word Smartify secure and remember your preferences.
        </p>
        <Button size="sm" className="shrink-0 self-start sm:self-auto" onClick={accept}>Accept cookies</Button>
      </div>
    </aside>
  )
}
