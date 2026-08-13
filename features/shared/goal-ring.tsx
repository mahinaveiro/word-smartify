import { cn } from '@/lib/utils'

/** Circular progress ring — flat, bordered, brutalist (no glow/gradient). */
export function GoalRing({
  value,
  max,
  size = 96,
  label,
  sublabel,
  className,
}: {
  value: number
  max: number
  size?: number
  label?: string
  sublabel?: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const stroke = 10
  const r = (size - stroke) / 2 - 2
  const c = 2 * Math.PI * r
  const dash = c * pct
  const center = size / 2

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--mint)"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${c - dash}`}
          className="transition-[stroke-dasharray] duration-[--duration-major] ease-[--ease-brutal]"
        />
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span className="font-heading text-xl font-bold">{label ?? `${Math.round(pct * 100)}%`}</span>
        {sublabel ? <span className="mt-1 text-[11px] text-muted-foreground">{sublabel}</span> : null}
      </span>
    </div>
  )
}
