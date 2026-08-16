'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CircleCheckBig, FileText, Flame, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { GoalRing } from '@/features/shared/goal-ring'
import { StatTile } from '@/features/shared/stat-tile'
import { useBookProgress, useDailyPlan, useProfile, useStats } from '@/hooks/use-data'
import { trackProductEvent } from '@/lib/product-analytics'

export function DashboardView() {
  const profileQuery = useProfile()
  const statsQuery = useStats()
  const planQuery = useDailyPlan()
  const bookProgressQuery = useBookProgress()
  const { data: profile } = profileQuery
  const { data: stats } = statsQuery
  const { data: plan } = planQuery
  const { data: bookProgress } = bookProgressQuery
  const trackedDashboardView = useRef(false)

  useEffect(() => {
    if (!trackedDashboardView.current && profile && stats && plan) {
      trackProductEvent('dashboard_viewed', {
        due_reviews: plan.review.due,
        new_words_remaining: plan.newLearning.remaining,
        daily_goal: plan.goal,
        streak: stats.current_streak,
      })
      trackedDashboardView.current = true
    }
  }, [plan, profile, stats])

  const queries = [profileQuery, statsQuery, planQuery, bookProgressQuery]
  if (queries.some((query) => query.isLoading)) return <DashboardSkeleton />
  if (queries.some((query) => query.error)) {
    return (
      <ErrorState
        title="Dashboard data couldn't be loaded"
        description="Your plan and progress are still safe. Try loading the dashboard again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }
  if (!profile || !stats || !plan) {
    return (
      <ErrorState
        title="Dashboard data is unavailable"
        description="We couldn't find the data needed to build your dashboard. Try again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }

  const firstName = profile.display_name.split(' ')[0]
  const bookSummary = plan.currentBook
    ? bookProgress?.find((progress) => progress.book_id === plan.currentBook?.id)
    : undefined
  const bookPercent = bookSummary && bookSummary.total > 0
    ? Math.round((bookSummary.learned / bookSummary.total) * 100)
    : 0
  const level = plan.newLearning.level

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {greeting()}
          </p>
          <h1 className="truncate text-balance font-heading text-2xl font-bold sm:text-3xl">{firstName}</h1>
        </div>
        <Badge variant="coral" className="shrink-0 gap-1.5 px-3 py-1.5 text-sm">
          <Flame className="size-4" aria-hidden />
          {stats.current_streak} day{stats.current_streak === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card className={plan.dayComplete ? 'overflow-hidden border-mint bg-mint/15' : 'overflow-hidden bg-coral/10'}>
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-5 xl:flex-col xl:items-start xl:gap-3">
              <GoalRing value={plan.progress.newWordsCompleted} max={plan.goal} sublabel="today" />
              <div>
                <p className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today&apos;s plan</p>
                <h2 className="mt-1 font-heading text-2xl font-bold">
                  {plan.dayComplete ? 'Day complete!' : `${plan.progress.newWordsCompleted} of ${plan.goal} words`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.dayComplete
                    ? 'Your assigned new-word goal is done. Extra practice keeps the momentum going.'
                    : `${plan.newLearning.remaining} new word${plan.newLearning.remaining === 1 ? '' : 's'} left in the assigned goal.`}
                </p>
              </div>
            </div>
            <div className="grid w-full gap-3 grid-cols-1 min-[480px]:grid-cols-3 xl:w-auto xl:min-w-[500px]">
              <PlanItem
                icon={BookOpen}
                title="New learning"
                detail={level ? `${plan.newLearning.remaining} left · ${level.title}` : 'All levels complete'}
                done={plan.dayComplete}
                href={level ? `/session/${level.id}` : '/learn'}
                action={plan.dayComplete ? 'Practice more' : 'Open session'}
                accent="mint"
              />
              <PlanItem
                icon={Target}
                title="Reviews"
                detail={`${plan.review.due} ready · ${plan.progress.reviewsCompleted} done today`}
                done={plan.review.due === 0}
                href="/review"
                action="Open reviews"
                accent="coral"
              />
              <PlanItem
                icon={Sparkles}
                title="Daily challenge"
                detail={plan.challenge.completed ? 'Finished for today' : 'Short quiz · +15 XP'}
                done={plan.challenge.completed}
                href="/challenge"
                action={plan.challenge.completed ? 'View challenge' : 'Take challenge'}
                accent="ink"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile icon={Zap} value={stats.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={BookOpen} value={stats.words_learned.toLocaleString()} label="Words learned" />
        <StatTile icon={Trophy} value={stats.words_mastered.toLocaleString()} label="Mastered" accent="mint" />
        <StatTile icon={Flame} value={stats.longest_streak} label="Best streak" />
      </div>

      <Card className="border-coral bg-coral/10">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground bg-coral text-coral-foreground shadow-brutal-sm">
              <FileText className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-heading text-lg font-bold">Mock test</p>
              <p className="text-sm text-muted-foreground">Timed practice to check what you remember.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
            <Link href="/mock-tests">Start a test <ArrowRight className="size-4" aria-hidden /></Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where you are</p>
                <h2 className="font-heading text-xl font-bold">{plan.currentBook?.name ?? 'Choose a book'}</h2>
              </div>
              <BookOpen className="size-6 text-mint" aria-hidden />
            </div>
            {bookSummary ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{bookSummary.learned.toLocaleString()} of {bookSummary.total.toLocaleString()} learned</span>
                  <span className="font-heading font-bold">{bookPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
                  <div className="h-full bg-mint" style={{ width: `${bookPercent}%` }} />
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Pick a book from Learn to start your path.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended next</p>
                <h2 className="font-heading text-xl font-bold">{plan.nextAction.title}</h2>
              </div>
              <ArrowRight className="size-6 text-coral" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">{plan.nextAction.detail}</p>
            <Button asChild size="sm" className="self-start">
              <Link
                href={plan.nextAction.href}
                onClick={() => trackProductEvent('today_action_opened', { action: plan.nextAction.title })}
              >
                {plan.nextAction.action} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PlanItem({
  icon: Icon,
  title,
  detail,
  done,
  href,
  action,
  accent,
}: {
  icon: typeof BookOpen
  title: string
  detail: string
  done: boolean
  href: string
  action: string
  accent: 'mint' | 'coral' | 'ink'
}) {
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-md border-2 border-foreground bg-card p-3 shadow-brutal-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`grid size-8 place-items-center rounded-md border-2 border-foreground ${accent === 'mint' ? 'bg-mint' : accent === 'coral' ? 'bg-coral' : 'bg-foreground text-background'}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        {done ? <CircleCheckBig className="size-5 text-mint-foreground" aria-label="Done" /> : null}
      </div>
      <div className="mt-3">
        <p className="font-heading text-sm font-bold">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button asChild variant="ghost" size="sm" className="mt-2 justify-start px-0 shadow-none">
        <Link
          href={href}
          onClick={() => trackProductEvent('today_action_opened', { action: title })}
        >
          {action} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}
