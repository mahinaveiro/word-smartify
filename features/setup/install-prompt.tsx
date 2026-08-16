'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, MoreVertical, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_FLAG = 'word-smartify:show-install-prompt'

export function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(INSTALL_FLAG)
  }, [])

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    if (isStandalone) return

    const shouldPrompt = window.sessionStorage.getItem(INSTALL_FLAG) === '1'
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPromptEvent)
      if (shouldPrompt) setOpen(true)
    }
    const onAppInstalled = () => close()

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    const fallbackTimer = shouldPrompt && !('BeforeInstallPromptEvent' in window)
      ? window.setTimeout(() => setOpen(true), 0)
      : null

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer)
    }
  }, [close])

  async function install() {
    if (!installEvent) {
      close()
      return
    }
    await installEvent.prompt()
    await installEvent.userChoice
    close()
  }

  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  if (isStandalone) return null

  return (
    <Modal
      open={open}
      onClose={close}
      title="Install Word Smartify"
      description="Keep your learning plan one tap away."
      footer={(
        <>
          <Button variant="ghost" onClick={close}>Maybe later</Button>
          {installEvent ? <Button onClick={() => void install()}><Download className="size-4" /> Install app</Button> : null}
        </>
      )}
    >
      {installEvent ? (
        <p className="text-sm leading-relaxed text-muted-foreground">Install the app for a faster, focused study experience with an icon on your home screen.</p>
      ) : (
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>On Android, open the browser menu and choose <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.</p>
          <p>On iPhone or iPad, tap <Share className="inline size-4 text-foreground" /> <strong className="text-foreground">Share</strong>, then choose <strong className="text-foreground">Add to Home Screen</strong>.</p>
          <p className="flex items-center gap-1 text-xs"><MoreVertical className="size-4" /> The exact menu label can vary by browser.</p>
        </div>
      )}
    </Modal>
  )
}
