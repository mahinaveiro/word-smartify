'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/features/shared/avatar'
import { cn } from '@/lib/utils'
import { formatWeekPeriod } from '@/lib/date'
import { useLeaderboard } from '@/hooks/use-data'
import { useAuth } from '@/features/auth/auth-provider'
import { OwnerDisplayName } from '@/lib/owner'
import type { LeaderboardMode } from '@/types/database'

export function LeaderboardView() {
  const [mode, setMode] = useState<LeaderboardMode>('all_time')
  const { data, error, isLoading, mutate } = useLeaderboard(mode, 20)
  const meId = useAuth().user?.id ?? null

  if (isLoading) return <LeaderboardSkeleton />
  if (error) {
    return (
      <ErrorState
        title="Leaderboard couldn't be loaded"
        description="Your ranking data is safe. Try loading the leaderboard again."
        onRetry={() => mutate()}
      />
    )
  }
  if (!data || data.entries.length === 0) {
    return (
      <EmptyState
        title="No rankings available yet."
        description={mode === 'weekly' ? 'Earn XP this week to appear in the weekly competition.' : 'Keep learning to appear in the competition.'}
        action={
          <Button asChild size="sm">
            <Link href="/learn">Go to Learn</Link>
          </Button>
        }
      />
    )
  }

  const top3 = data.entries.filter((entry) => entry.rank <= 3).slice(0, 3)
  const currentUser = data.current_user
  const currentUserIsOutsideTop = Boolean(currentUser && currentUser.rank > 3)
  const rest = data.entries.filter((entry) => entry.rank > 3 && entry.profile.id !== currentUser?.profile.id)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Compete"
        title="Leaderboard"
        description={mode === 'weekly' ? `Saturday–Friday competition · ${formatWeekPeriod({ start: data.week_start, end: data.week_end })}` : 'Ranked by total XP. Keep your streak alive to climb.'}
      />

      <div className="grid grid-cols-2 gap-2 rounded-md border-2 border-foreground bg-card p-1 shadow-brutal-sm" role="tablist" aria-label="Leaderboard mode">
        {(['all_time', 'weekly'] as const).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            role="tab"
            aria-selected={mode === nextMode}
            onClick={() => setMode(nextMode)}
            className={cn('rounded-sm px-3 py-2 font-heading text-sm font-bold transition-colors', mode === nextMode ? 'bg-foreground text-primary-foreground' : 'hover:bg-muted')}
          >
            {nextMode === 'all_time' ? 'All Time' : 'This Week'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {podium.map((entry) => {
          const rank = entry.rank
          const isMe = entry.profile.id === meId
          const height = rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-16'
          const medal = rank === 1 ? 'bg-mint text-mint-foreground' : rank === 2 ? 'bg-muted text-foreground' : 'bg-coral text-coral-foreground'
          return (
            <Link key={entry.profile.id} href={`/profile/${entry.profile.id}`} className="flex flex-col items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar name={entry.profile.display_name} avatarId={entry.profile.avatar_id} avatarUrl={entry.profile.avatar_url} size={rank === 1 ? 'lg' : 'md'} />
              <div className="text-center">
                <p className={cn('max-w-[8rem] truncate font-heading text-sm font-bold', isMe && 'text-mint-foreground')}>
                  <OwnerDisplayName userId={entry.profile.id} name={isMe ? 'You' : entry.profile.display_name} />
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">{scoreFor(entry, mode).toLocaleString()} {mode === 'weekly' ? 'XP this week' : 'XP'}</p>
              </div>
              <div className={cn('flex w-full items-start justify-center rounded-t-md border-2 border-foreground pt-2 font-heading text-xl font-bold shadow-brutal-sm', height, medal)}>{rank}</div>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        {rest.map((entry) => <LeaderboardRow key={entry.profile.id} entry={entry} mode={mode} meId={meId} />)}
      </div>

      {currentUserIsOutsideTop && currentUser ? (
        <div className="flex flex-col gap-2">
          <p className="font-heading text-xs font-bold uppercase tracking-wide text-muted-foreground">Your position</p>
          <LeaderboardRow entry={currentUser} mode={mode} meId={meId} />
        </div>
      ) : null}
    </div>
  )
}

function LeaderboardRow({ entry, mode, meId }: { entry: NonNullable<ReturnType<typeof useLeaderboard>['data']>['entries'][number]; mode: LeaderboardMode; meId: string | null }) {
  const isMe = entry.profile.id === meId
  return (
    <Link href={`/profile/${entry.profile.id}`} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className={cn(isMe && 'border-mint bg-mint/20')}>
        <div className="flex items-center gap-3 p-3">
          <span className="w-6 text-center font-heading text-sm font-bold tabular-nums text-muted-foreground">{entry.rank}</span>
          <Avatar name={entry.profile.display_name} avatarId={entry.profile.avatar_id} avatarUrl={entry.profile.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              <OwnerDisplayName userId={entry.profile.id} name={isMe ? 'You' : entry.profile.display_name} />
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="size-3" aria-hidden />{entry.stats.current_streak} day streak</p>
          </div>
          <span className="flex items-center gap-1 font-heading text-sm font-bold tabular-nums">
            <Trophy className="size-3.5 text-mint-foreground" aria-hidden />
            {scoreFor(entry, mode).toLocaleString()}
          </span>
        </div>
      </Card>
    </Link>
  )
}

function scoreFor(entry: NonNullable<ReturnType<typeof useLeaderboard>['data']>['entries'][number], mode: LeaderboardMode) {
  return mode === 'weekly' ? (entry.stats.weekly_xp ?? 0) : entry.stats.total_xp
}

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-3 items-end gap-3">{[20, 28, 16].map((h, i) => <div key={i} className="flex flex-col items-center gap-2"><Skeleton className="size-11 rounded-full" /><Skeleton className="h-4 w-16" /><Skeleton className={`h-${h} w-full`} /></div>)}</div>
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  )
}
