import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  tone?: 'mint' | 'ink' | 'coral'
  label?: string
  showValue?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = 'mint',
  label,
  showValue,
}: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const fill =
    tone === 'ink' ? 'bg-primary' : tone === 'coral' ? 'bg-coral' : 'bg-mint'

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          {label ? <span>{label}</span> : <span />}
          {showValue ? (
            <span className="tabular-nums text-foreground">
              {Math.round(value)}/{max}
            </span>
          ) : null}
        </div>
      )}
      <div
        className="h-3 w-full overflow-hidden rounded-md border-2 border-foreground bg-card"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full transition-[width] duration-normal ease-brutal', fill)}
          style={{ width: `${pct}%`, transitionTimingFunction: 'var(--ease-brutal)' }}
        />
      </div>
    </div>
  )
}
