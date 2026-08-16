'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, MoreVertical, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_SEEN_KEY = 'word-smartify:install-prompt-seen'

type DeviceType = 'android' | 'ios' | 'desktop'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
}

function getDeviceType(): DeviceType {
  const userAgent = window.navigator.userAgent
  if (/android/i.test(userAgent)) return 'android'
  if (/iPad|iPhone|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'desktop'
}

function hasSeenPrompt() {
  try {
    return window.localStorage.getItem(INSTALL_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markPromptSeen() {
  try {
    window.localStorage.setItem(INSTALL_SEEN_KEY, '1')
  } catch {
    // Storage can be unavailable in private browsing; the prompt still works for this session.
  }
}

export function InstallPrompt({ enabled, onDone }: { enabled: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [device, setDevice] = useState<DeviceType>('desktop')
  const enabledRef = useRef(enabled)

  const finish = useCallback(() => {
    setOpen(false)
    markPromptSeen()
    onDone()
  }, [onDone])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
    }
    const onAppInstalled = () => {
      if (enabledRef.current) finish()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [finish])

  useEffect(() => {
    if (!enabled) return

    if (isStandalone() || hasSeenPrompt()) {
      onDone()
      return
    }

    markPromptSeen()
    const timer = window.setTimeout(() => {
      setDevice(getDeviceType())
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [enabled, onDone])

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    finish()
  }

  if (!open) return null

  const isIos = device === 'ios'
  const title = isIos ? 'Add Word Smartify to Home Screen' : 'Install Word Smartify'
  const description = isIos ? 'Keep your study plan one tap away.' : 'Get a faster, focused study experience.'

  return (
    <Modal
      open={open}
      onClose={finish}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="ghost" onClick={finish}>Maybe later</Button>
          {installEvent && !isIos ? <Button onClick={() => void install()}><Download className="size-4" aria-hidden /> Install app</Button> : null}
        </>
      )}
    >
      {isIos ? (
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>Tap <Share className="inline size-4 text-foreground" aria-hidden /> <strong className="text-foreground">Share</strong> in your browser.</p>
          <p>Choose <strong className="text-foreground">Add to Home Screen</strong>, then tap <strong className="text-foreground">Add</strong>.</p>
        </div>
      ) : installEvent ? (
        <p className="text-sm leading-relaxed text-muted-foreground">Install the app for quick access, a cleaner study screen, and a home-screen icon.</p>
      ) : (
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{device === 'android' ? 'Tap the browser menu' : 'Use the install icon in your browser address bar or menu'} and choose <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.</p>
          <p className="flex items-center gap-1 text-xs"><MoreVertical className="size-4 shrink-0" aria-hidden /> The exact label can vary by browser.</p>
        </div>
      )}
    </Modal>
  )
}
