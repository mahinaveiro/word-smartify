'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this right now. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-foreground bg-card px-6 py-12 text-center shadow-brutal',
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-md border-2 border-foreground bg-coral text-coral-foreground">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h3 className="font-heading text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-pretty text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
