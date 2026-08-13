import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatTile({
  icon: Icon,
  value,
  label,
  accent = 'card',
  className,
}: {
  icon?: LucideIcon
  value: string | number
  label: string
  accent?: 'card' | 'mint' | 'coral' | 'ink'
  className?: string
}) {
  const accents = {
    card: 'bg-card text-foreground',
    mint: 'bg-mint text-mint-foreground',
    coral: 'bg-coral text-coral-foreground',
    ink: 'bg-foreground text-primary-foreground',
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[--radius-md] border-2 border-foreground p-4 shadow-brutal-sm',
        accents[accent],
        className,
      )}
    >
      {Icon ? <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" /> : null}
      <span className="font-heading text-2xl font-bold leading-none">{value}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
  )
}
