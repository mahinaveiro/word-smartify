import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  eyebrow?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  eyebrow,
  description,
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
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance font-heading text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-pretty text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
