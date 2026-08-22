import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useActions } from '@/hooks/use-actions'
import { STUDY_GC_TELEGRAM_URL } from '@/lib/owner'

function sessionKey(userId: string) {
  return `study-gc-invite-seen:${userId}`
}

export function StudyGcPrompt({ enabled = true, userId, joined, onDone }: { enabled?: boolean; userId: string; joined: boolean; onDone: () => void }) {
  const { updateProfile, revalidateUser } = useActions()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (joined) {
      onDone()
      return
    }

    let shouldOpen = true
    try {
      shouldOpen = sessionStorage.getItem(sessionKey(userId)) !== '1'
      if (shouldOpen) sessionStorage.setItem(sessionKey(userId), '1')
    } catch {
      shouldOpen = true
    }

    if (!shouldOpen) {
      onDone()
      return
    }
    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [enabled, joined, onDone, userId])

  const handleLater = useCallback(() => {
    setOpen(false)
    setError(null)
    onDone()
  }, [onDone])

  const handleJoin = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    window.open(STUDY_GC_TELEGRAM_URL, '_blank', 'noopener,noreferrer')
    try {
      await updateProfile({ study_gc_joined: true })
      await revalidateUser()
      setOpen(false)
      onDone()
    } catch {
      setError('We could not save your choice. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [onDone, revalidateUser, saving, updateProfile])

  return (
    <Modal
      open={open && enabled && !joined}
      onClose={handleLater}
      title="Join our study gc"
      description="Stay close to the community and share what you are learning."
      footer={(
        <>
          <Button variant="ghost" onClick={handleLater} disabled={saving}>Later</Button>
          <Button onClick={handleJoin} loading={saving}>
            <Send className="size-4" aria-hidden /> Join Telegram
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">Join the Word Smartify study group on Telegram.</p>
        <a
          href={STUDY_GC_TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 font-medium text-foreground underline underline-offset-4"
        >
          t.me/IBAorDIE <ExternalLink className="size-3.5" aria-hidden />
        </a>
        {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    </Modal>
  )
}
