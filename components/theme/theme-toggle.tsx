'use client'

import { LoaderCircle, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './theme-provider'

interface ThemeToggleProps {
  compact?: boolean
  className?: string
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { theme, toggleTheme, isSaving } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  const label = theme === 'dark' ? 'Dark mode' : 'Light mode'

  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      disabled={isSaving}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      className={cn(
        'press touch-target inline-flex items-center rounded-[--radius-md] border-2 border-transparent text-foreground/80 hover:border-foreground hover:bg-card disabled:cursor-wait disabled:opacity-70',
        compact ? 'size-11 shrink-0 justify-center bg-card shadow-brutal-sm' : 'w-full justify-start gap-3 px-3 py-2.5 text-left font-medium',
        className,
      )}
    >
      {isSaving ? <LoaderCircle className="size-5 animate-spin" strokeWidth={2.25} aria-hidden="true" /> : <Icon className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
      {!compact ? <span className="text-[15px]">{label}</span> : null}
      {!compact && isSaving ? <span className="ml-auto text-xs text-muted-foreground">Saving…</span> : null}
    </button>
  )
}
