'use client'

import Link from 'next/link'
import { Flame, Sparkles, Target, BookOpen, Trophy, Zap, CircleCheckBig, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GoalRing } from '@/features/shared/goal-ring'
import { StatTile } from '@/features/shared/stat-tile'
import { useProfile, useStats, useDailyProgress, useDueForReview, useBooks, useLevelsForBook } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { xpToLevel } from '@/lib/learning-logic'
import { todayISO } from '@/lib/date'
import { useToast } from '@/components/ui/toast'

export function DashboardView() {
  const { data: profile } = useProfile()
  const { data: stats } = useStats()
  const today = todayISO()
  const { data: daily } = useDailyProgress(today)
  const { data: due } = useDueForReview()
  const { data: books } = useBooks()
  const currentBookId = profile?.current_book_id ?? books?.[0]?.id ?? null
  const { data: levels } = useLevelsForBook(currentBookId)
  const { completeDailyChallenge, revalidateUser } = useActions()
  const { toast } = useToast()

  if (!profile || !stats) return <DashboardSkeleton />

  const goal = profile.daily_goal
  const doneToday = daily?.new_words_completed ?? 0
  const level = xpToLevel(stats.total_xp)
  const dueCount = due?.length ?? 0
  const nextLevel = levels?.[0]
  const challengeDone = daily?.challenge_completed ?? false

  const firstName = profile.display_name.split(' ')[0]

  async function onChallenge() {
    const res = await completeDailyChallenge()
    revalidateUser()
    toast(
      res.alreadyDone
        ? { title: 'Already completed', description: "You've claimed today's challenge.", tone: 'default' }
        : { title: 'Challenge complete!', description: '+15 XP added to your total.', tone: 'success' },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {greeting()}
          </p>
          <h1 className="truncate text-balance font-heading text-2xl font-bold sm:text-3xl">
            {firstName}
          </h1>
        </div>
        <Badge variant="coral" className="shrink-0 gap-1.5 px-3 py-1.5 text-sm">
          <Flame className="size-4" aria-hidden />
          {stats.current_streak} day{stats.current_streak === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Daily goal hero */}
      <Card className="overflow-hidden">
        <CardContent className="flex items-center gap-5 p-5">
          <GoalRing value={doneToday} max={goal} sublabel="today" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Daily goal
            </p>
            <p className="mt-0.5 text-pretty text-lg font-bold leading-snug">
              {doneToday >= goal
                ? 'Goal smashed. Keep the streak alive!'
                : `${goal - doneToday} more word${goal - doneToday === 1 ? '' : 's'} to hit today's goal`}
            </p>
            <div className="mt-3">
              <Button asChild size="sm">
                <Link href="/learn">
                  {doneToday > 0 ? 'Keep learning' : 'Start learning'}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level progress */}
      <Card flat className="border-foreground/15 bg-muted/40">
        <CardContent className="flex items-center gap-4 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-md border-2 border-foreground bg-mint font-heading text-lg font-bold text-mint-foreground shadow-brutal-sm">
            {level.level}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-sm font-bold">Level {level.level}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {level.into}/{level.span} XP
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-foreground bg-card">
              <div
                className="h-full bg-mint transition-[width] duration-[--duration-major]"
                style={{ width: `${level.pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Zap} value={stats.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={BookOpen} value={stats.words_learned.toLocaleString()} label="Words learned" />
        <StatTile icon={Trophy} value={stats.words_mastered.toLocaleString()} label="Mastered" accent="mint" />
        <StatTile icon={Flame} value={stats.longest_streak} label="Best streak" />
      </div>

      {/* Review + Challenge */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-coral" aria-hidden />
              <h2 className="font-heading text-base font-bold">Review due</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {dueCount > 0
                ? `${dueCount} word${dueCount === 1 ? '' : 's'} ready to reinforce.`
                : 'Nothing due right now. Great job staying on top of reviews.'}
            </p>
            <Button asChild variant={dueCount > 0 ? 'primary' : 'outline'} size="sm" disabled={dueCount === 0}>
              <Link href="/review">Review {dueCount > 0 ? `(${dueCount})` : ''}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-mint" aria-hidden />
              <h2 className="font-heading text-base font-bold">Daily challenge</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {challengeDone
                ? 'Completed today. Come back tomorrow for a new one.'
                : 'Finish a quick challenge for bonus XP.'}
            </p>
            <Button onClick={onChallenge} variant="accent" size="sm" disabled={challengeDone}>
              {challengeDone ? (
                <>
                  <CircleCheckBig className="size-4" aria-hidden /> Done
                </>
              ) : (
                'Claim +15 XP'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {nextLevel ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Up next
              </p>
              <p className="truncate font-heading text-base font-bold">{nextLevel.title}</p>
              <p className="text-sm text-muted-foreground">{nextLevel.word_count} words</p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/learn/level/${nextLevel.id}`}>Open</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
