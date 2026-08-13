import type { WordStatus } from '@/types/database'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<WordStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-card text-foreground' },
  learning: { label: 'Learning', className: 'bg-muted text-foreground' },
  familiar: { label: 'Familiar', className: 'bg-coral text-coral-foreground' },
  mastered: { label: 'Mastered', className: 'bg-mint text-mint-foreground' },
}

export function WordStatusBadge({ status, className }: { status: WordStatus; className?: string }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-2 border-foreground px-2.5 py-0.5 text-xs font-semibold',
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  )
}

export { STATUS_STYLES }
