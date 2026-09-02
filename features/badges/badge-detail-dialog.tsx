'use client'

import Image from 'next/image'
import { CalendarDays, ShieldCheck, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { formatBadgePeriod } from '@/lib/badges'
import type { DisplayBadge } from '@/types/database'

const toneClasses: Record<DisplayBadge['tone'], string> = {
  gold: 'border-amber-600/70 bg-amber-100 text-amber-950 dark:border-amber-600/70 dark:bg-amber-100 dark:text-amber-950',
  violet: 'border-violet-500/60 bg-violet-50 dark:bg-violet-950/30',
  mint: 'border-mint bg-mint/10',
  coral: 'border-coral bg-coral/10',
  sky: 'border-sky-500/60 bg-sky-50 dark:bg-sky-950/30',
}

export function BadgeDetailDialog({ badge, onClose }: { badge: DisplayBadge | null; onClose: () => void }) {
  const period = badge ? formatBadgePeriod(badge.weekStart, badge.weekEnd) : null

  return (
    <Modal
      open={badge != null}
      onClose={onClose}
      title={badge?.title}
      className={cn(
        'max-w-sm overflow-hidden sm:max-w-md',
        badge?.category === 'owner' && 'text-amber-950 dark:text-amber-950',
      )}
    >
      {badge ? (
        <div className="space-y-4">
          <div className={cn('relative flex min-h-36 items-center justify-center overflow-hidden rounded-md border-2 p-5', toneClasses[badge.tone])}>
            <div className="pointer-events-none absolute -right-5 -top-6 size-24 rounded-full bg-white/50 blur-2xl dark:bg-foreground/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-5 size-24 rounded-full bg-white/60 blur-2xl dark:bg-foreground/10" />
            <Image
              src={badge.assetSrc}
              alt=""
              width={116}
              height={116}
              unoptimized
              draggable={false}
              className="relative size-24 object-contain drop-shadow-md sm:size-28"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <p className={cn('text-sm font-semibold leading-relaxed', badge.category === 'owner' ? 'text-amber-950' : 'text-foreground')}>{badge.description}</p>
            </div>
            <div className={cn(
              'rounded-md border-2 p-3',
              badge.category === 'owner' ? 'border-amber-600/30 bg-amber-50 text-amber-950' : 'border-foreground/10 bg-muted/40',
            )}>
              <p className={cn('mb-1 text-[11px] font-bold uppercase tracking-[0.16em]', badge.category === 'owner' ? 'text-amber-950/75' : 'text-muted-foreground')}>Why this badge</p>
              <p className={cn('text-sm leading-relaxed', badge.category === 'owner' ? 'text-amber-950' : 'text-foreground/80')}>{badge.reason}</p>
            </div>
            {period ? (
              <p className={cn('flex items-center gap-2 text-xs font-medium', badge.category === 'owner' ? 'text-amber-950/80' : 'text-muted-foreground')}>
                <CalendarDays className="size-3.5" aria-hidden />
                Previous completed week: {period}
              </p>
            ) : badge.category === 'owner' ? (
              <p className="flex items-center gap-2 text-xs font-medium text-amber-950/80">
                <ShieldCheck className="size-3.5" aria-hidden />
                Permanent creator badge
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
