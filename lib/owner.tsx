import Image from 'next/image'
import { cn } from '@/lib/utils'

export const OWNER_USER_ID = 'f35d5693-11e6-470f-a498-28ce07161c26'
export const OWNER_MARKER_ALT = 'Word Smartify owner'
export const STUDY_GC_TELEGRAM_URL = 'https://t.me/IBAorDIE'
export const STUDY_GC_DISCORD_URL = 'https://discord.gg/y7u7uGPt7'

export function isOwnerUserId(userId: string | null | undefined) {
  return userId === OWNER_USER_ID
}

export function OwnerDisplayName({
  userId,
  name,
  className,
}: {
  userId: string | null | undefined
  name: string
  className?: string
}) {
  const isOwner = isOwnerUserId(userId)

  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1', className)}>
      <span className="min-w-0 truncate">{name}</span>
      {isOwner ? (
        <Image
          src="/star.gif"
          alt={OWNER_MARKER_ALT}
          width={20}
          height={20}
          unoptimized
          className="size-4 shrink-0 object-contain sm:size-5"
          draggable={false}
        />
      ) : null}
    </span>
  )
}
