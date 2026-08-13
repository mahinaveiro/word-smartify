'use client'

import { Flame, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Avatar } from '@/features/shared/avatar'
import { cn } from '@/lib/utils'
import { useLeaderboard } from '@/hooks/use-data'
import { CURRENT_USER_ID } from '@/repositories'

export function LeaderboardView() {
  const { data, error, isLoading, mutate } = useLeaderboard(20)

  if (isLoading) return <LeaderboardSkeleton />
  if (error || !data) return <ErrorState onRetry={() => mutate()} />

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)
  // Podium display order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Compete"
        title="Leaderboard"
        description="Ranked by total XP. Keep your streak alive to climb."
      />

      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {podium.map((entry) => {
          const rank = data.indexOf(entry) + 1
          const isMe = entry.profile.id === CURRENT_USER_ID
          const height = rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-16'
          const medal = rank === 1 ? 'bg-mint text-mint-foreground' : rank === 2 ? 'bg-muted text-foreground' : 'bg-coral text-coral-foreground'
          return (
            <div key={entry.profile.id} className="flex flex-col items-center gap-2">
              <Avatar
                name={entry.profile.display_name}
                avatarId={entry.profile.avatar_id}
                size={rank === 1 ? 'lg' : 'md'}
              />
              <div className="text-center">
                <p className={cn('max-w-[8rem] truncate font-heading text-sm font-bold', isMe && 'text-mint-foreground')}>
                  {isMe ? 'You' : entry.profile.display_name}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {entry.stats.total_xp.toLocaleString()} XP
                </p>
              </div>
              <div
                className={cn(
                  'flex w-full items-start justify-center rounded-t-md border-2 border-foreground pt-2 font-heading text-xl font-bold shadow-brutal-sm',
                  height,
                  medal,
                )}
              >
                {rank}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        {rest.map((entry, i) => {
          const rank = i + 4
          const isMe = entry.profile.id === CURRENT_USER_ID
          return (
            <Card
              key={entry.profile.id}
              className={cn(isMe && 'border-mint bg-mint/20')}
            >
              <div className="flex items-center gap-3 p-3">
                <span className="w-6 text-center font-heading text-sm font-bold tabular-nums text-muted-foreground">
                  {rank}
                </span>
                <Avatar name={entry.profile.display_name} avatarId={entry.profile.avatar_id} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {isMe ? 'You' : entry.profile.display_name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="size-3" aria-hidden />
                    {entry.stats.current_streak} day streak
                  </p>
                </div>
                <span className="flex items-center gap-1 font-heading text-sm font-bold tabular-nums">
                  <Trophy className="size-3.5 text-mint-foreground" aria-hidden />
                  {entry.stats.total_xp.toLocaleString()}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-48" />
      <div className="grid grid-cols-3 items-end gap-3">
        {[20, 28, 16].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className={`h-${h} w-full`} />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
