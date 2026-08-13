'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)
  const idRef = React.useRef(0)

  React.useEffect(() => setMounted(true), [])

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'default' }) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, title, description, tone }])
      setTimeout(() => remove(id), 3800)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end sm:px-0"
            role="region"
            aria-live="polite"
            aria-label="Notifications"
          >
            {toasts.map((t) => (
              <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon =
    item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? AlertTriangle : Info
  const accent =
    item.tone === 'success'
      ? 'bg-mint text-mint-foreground'
      : item.tone === 'error'
        ? 'bg-coral text-coral-foreground'
        : 'bg-primary text-primary-foreground'

  return (
    <div
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border-2 border-foreground bg-card p-3 shadow-brutal duration-normal animate-in slide-in-from-bottom-3"
      role="status"
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', accent)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-bold leading-snug">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="press -m-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
