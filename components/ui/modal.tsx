'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 animate-in fade-in duration-micro"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-md md:max-w-lg rounded-lg border-2 border-foreground bg-card shadow-brutal-lg animate-in fade-in zoom-in-95 duration-normal ease-brutal',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-0">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-heading text-lg font-bold leading-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children ? <div className="p-5">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t-2 border-foreground/10 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
