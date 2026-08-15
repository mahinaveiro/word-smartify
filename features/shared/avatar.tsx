import { cn } from '@/lib/utils'

const AVATAR_BG: Record<string, string> = {
  coral: 'bg-coral text-coral-foreground',
  mint: 'bg-mint text-mint-foreground',
  ink: 'bg-foreground text-primary-foreground',
  sand: 'bg-muted text-foreground',
}

const SIZES = {
  sm: 'size-8 text-sm',
  md: 'size-11 text-base',
  lg: 'size-16 text-2xl',
  xl: 'size-24 text-4xl',
}

export function Avatar({
  name,
  avatarId = 'mint',
  avatarUrl,
  size = 'md',
  className,
}: {
  name: string
  avatarId?: string
  avatarUrl?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-foreground font-heading font-bold shadow-brutal-sm',
        AVATAR_BG[avatarId] ?? AVATAR_BG.mint,
        SIZES[size],
        className,
      )}
    >
      {avatarUrl ? <span className="size-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${avatarUrl})` }} /> : initials}
    </span>
  )
}

export const AVATAR_OPTIONS = Object.keys(AVATAR_BG)
