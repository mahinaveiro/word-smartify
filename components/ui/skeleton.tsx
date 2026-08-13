import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md border-2 border-foreground/10 bg-muted',
        className,
      )}
      aria-hidden
      {...props}
    />
  )
}
