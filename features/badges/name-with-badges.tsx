'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { createDisplayBadge } from '@/lib/badges'
import { cn } from '@/lib/utils'
import type { DisplayBadge, UUID } from '@/types/database'
import { BadgeDetailDialog } from './badge-detail-dialog'

const badgeSizeClasses = {
  sm: 'size-4 sm:size-[1.125rem]',
  md: 'size-[1.125rem] sm:size-5',
  lg: 'size-5 sm:size-6',
} as const

export function NameWithBadges({
  userId,
  name,
  mobileName,
  badges = [],
  className,
  badgeSize = 'md',
}: {
  userId?: UUID | null
  name: string
  mobileName?: string
  badges?: DisplayBadge[]
  className?: string
  badgeSize?: keyof typeof badgeSizeClasses
}) {
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null)
  const allBadges = useMemo(() => {
    if (!userId || userId !== 'f35d5693-11e6-470f-a498-28ce07161c26') return badges
    if (badges.some((badge) => badge.key === 'word-smartify-owner')) return badges
    const ownerBadge = createDisplayBadge('word-smartify-owner')
    return ownerBadge ? [ownerBadge, ...badges] : badges
  }, [badges, userId])

  return (
    <>
      <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1', className)}>
        <span className="hidden min-w-0 truncate sm:inline">{name}</span>
        <span className="min-w-0 truncate sm:hidden">{mobileName ?? name}</span>
        {allBadges.length ? (
          <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={`${name}'s badges`}>
            {allBadges.map((badge) => (
              <button
                key={`${badge.key}-${badge.awardId ?? 'static'}`}
                type="button"
                aria-label={`View ${badge.title} badge`}
                title={badge.shortTitle}
                className={cn(
                  'group inline-flex shrink-0 rounded-full outline-none transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  badge.key === 'word-smartify-owner' && 'border border-amber-500/80 bg-amber-100 p-0.5 dark:border-amber-300 dark:bg-amber-200',
                )}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setSelectedBadge(badge)
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Image
                  src={badge.assetSrc}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  draggable={false}
                  className={cn(badgeSizeClasses[badgeSize], 'object-contain drop-shadow-sm')}
                />
              </button>
            ))}
          </span>
        ) : null}
      </span>
      <BadgeDetailDialog badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </>
  )
}
