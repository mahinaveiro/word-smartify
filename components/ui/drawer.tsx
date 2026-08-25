'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'left' | 'right' | 'bottom'
  children?: React.ReactNode
  className?: string
}

export function Drawer({
  open,
  onClose,
  title,
  side = 'bottom',
  children,
  className,
}: DrawerProps) {
  const mounted = React.useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  const position =
    side === 'left'
      ? 'inset-y-0 left-0 h-full w-[86%] max-w-sm md:max-w-md border-r-2 animate-in slide-in-from-left duration-normal ease-brutal'
      : side === 'right'
        ? 'inset-y-0 right-0 h-full w-[86%] max-w-sm md:max-w-md border-l-2 animate-in slide-in-from-right duration-normal ease-brutal'
        : 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-xl border-t-2 animate-in slide-in-from-bottom duration-normal ease-brutal'

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-foreground/40 animate-in fade-in duration-micro dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute border-foreground bg-card shadow-brutal-lg',
          position,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-foreground/10 p-4">
          <h2 className="font-heading text-base font-bold">{title}</h2>
          <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="no-scrollbar overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
