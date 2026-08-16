import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  eyebrow?: string
  description?: string
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  eyebrow,
  description,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
        <h1 className="text-balance font-heading text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h1>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
