'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Sparkles, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useActions } from '@/hooks/use-actions'
import { formatBadgePeriod } from '@/lib/badges'
import type { PendingBadgeAward } from '@/types/database'

export function BadgeCongratulationsModal({
  enabled,
  awards,
  isLoading,
  onDone,
  skipAcknowledgement = false,
}: {
  enabled: boolean
  awards: PendingBadgeAward[]
  isLoading: boolean
  onDone: () => void
  skipAcknowledgement?: boolean
}) {
  const { acknowledgeBadgeAwards } = useActions()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completedEmptyState = useRef(false)
  const awardIds = useMemo(() => awards.map((award) => award.id), [awards])
  const primaryAward = awards[0]
  const periodLabels = Array.from(
    new Set(
      awards
        .map((award) => formatBadgePeriod(award.display.weekStart, award.display.weekEnd))
        .filter((period): period is string => period != null),
    ),
  )

  useEffect(() => {
    if (!enabled || isLoading || awards.length > 0 || completedEmptyState.current) return
    completedEmptyState.current = true
    onDone()
  }, [awards.length, enabled, isLoading, onDone])

  const finish = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (!skipAcknowledgement) {
        await acknowledgeBadgeAwards(awardIds)
      }
      onDone()
    } catch {
      setError('Your reward is safe, but we could not mark it as seen. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [acknowledgeBadgeAwards, awardIds, onDone, saving, skipAcknowledgement])

  return (
    <Modal
      open={enabled && !isLoading && awards.length > 0}
      onClose={finish}
      title="Badge unlocked!"
      description="A new mark of progress has been added to your name."
      className="max-w-md overflow-hidden sm:max-w-lg"
      footer={(
        <Button className="w-full sm:w-auto" onClick={finish} loading={saving}>
          <Check className="size-4" aria-hidden /> Continue
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}
    >
      <div className="relative space-y-5">
        <div className="pointer-events-none absolute -inset-4 overflow-hidden" aria-hidden>
          <span className="badge-sparkle absolute left-[12%] top-3 text-amber-500"><Sparkles className="size-4" /></span>
          <span className="badge-sparkle absolute right-[13%] top-8 text-violet-500 [animation-delay:180ms]"><Sparkles className="size-3.5" /></span>
          <span className="badge-sparkle absolute bottom-16 left-[22%] text-mint-foreground [animation-delay:360ms]"><Sparkles className="size-3" /></span>
        </div>

        <div className="relative flex min-h-44 items-center justify-center gap-3 rounded-md border-2 border-foreground bg-gradient-to-br from-amber-100 via-card to-violet-100 p-5 shadow-brutal dark:from-amber-950/40 dark:via-card dark:to-violet-950/40 sm:min-h-52 sm:gap-5">
          <div className="absolute inset-x-8 bottom-3 h-3 rounded-full bg-foreground/10 blur-md" aria-hidden />
          {awards.map((award, index) => (
            <div
              key={award.id}
              className="relative grid size-28 place-items-center rounded-full border-2 border-foreground/20 bg-white/70 p-3 shadow-brutal-sm animate-in zoom-in-75 duration-normal dark:bg-white/10 sm:size-36 sm:p-4"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <Image
                src={award.display.assetSrc}
                alt={award.display.title}
                width={132}
                height={132}
                unoptimized
                draggable={false}
                className="size-full object-contain drop-shadow-lg"
              />
            </div>
          ))}
        </div>

        <div className="relative space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-mint px-3 py-1 text-xs font-bold text-mint-foreground shadow-brutal-sm">
            <Trophy className="size-3.5" aria-hidden /> Game completion reward
          </div>
          <h3 className="font-heading text-2xl font-bold sm:text-3xl">
            {awards.length === 1 ? awards[0].display.title : `${awards.length} badges earned`}
          </h3>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {awards.length === 1
              ? awards[0].display.reason
              : 'Your community contribution and leaderboard performance earned these marks of recognition.'}
          </p>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-2">
          {awards.map((award) => (
            <span key={award.id} className="inline-flex items-center gap-1.5 rounded-md border-2 border-foreground/15 bg-muted/60 px-2.5 py-1.5 text-xs font-semibold">
              <span className="size-4 overflow-hidden rounded-full bg-card">
                <Image src={award.display.assetSrc} alt="" width={16} height={16} unoptimized className="size-full object-contain" />
              </span>
              {award.display.shortTitle}
            </span>
          ))}
        </div>

        {periodLabels.length ? (
          <p className="relative flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden /> Previous completed week: {periodLabels.join(' · ')}
          </p>
        ) : null}
        {error ? <p className="relative text-center text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      </div>
    </Modal>
  )
}
