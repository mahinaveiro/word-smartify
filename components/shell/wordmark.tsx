import { cn } from '@/lib/utils'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[--radius-sm] border-2 border-foreground bg-mint font-heading text-lg font-bold text-mint-foreground shadow-brutal-sm"
      >
        W
      </span>
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Word Smartify
      </span>
    </span>
  )
}
