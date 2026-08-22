'use client'

import { NameWithBadges } from '@/features/badges/name-with-badges'
import type { DisplayBadge, UUID } from '@/types/database'

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
  mobileName,
  className,
  badges,
  badgeSize = 'md',
}: {
  userId: UUID | null | undefined
  name: string
  mobileName?: string
  className?: string
  badges?: DisplayBadge[]
  badgeSize?: 'sm' | 'md' | 'lg'
}) {
  return <NameWithBadges userId={userId} name={name} mobileName={mobileName} badges={badges} className={className} badgeSize={badgeSize} />
}
