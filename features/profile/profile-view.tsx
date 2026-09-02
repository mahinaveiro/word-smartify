'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  FileText,
  Flame,
  Lock,
  Settings,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Avatar } from '@/features/shared/avatar'
import { StatTile } from '@/features/shared/stat-tile'
import {
  useBookProgress,
  useBooks,
  useMyDisplayBadges,
  useMockTests,
  useProfile,
  useProgressSummary,
  useStats,
} from '@/hooks/use-data'
import { shortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { isOwnerUserId, OwnerDisplayName } from '@/lib/owner'

interface Achievement {
  id: string
  label: string
  description: string
  earned: boolean
}

export function ProfileView() {
  const profileQuery = useProfile()
  const statsQuery = useStats()
  const progressQuery = useProgressSummary()
  const bookProgressQuery = useBookProgress()
  const booksQuery = useBooks()
  const testsQuery = useMockTests()
  const badgesQuery = useMyDisplayBadges()
  const { data: profile } = profileQuery
  const { data: stats } = statsQuery
  const { data: progressSummary } = progressQuery
  const { data: bookProgress } = bookProgressQuery
  const { data: books } = booksQuery
  const { data: tests } = testsQuery
  const { data: badges } = badgesQuery

  useEffect(() => {
    if (!profile) return
    document.title = `${profile.display_name} · Word Smartify owner`
    return () => {
      document.title = 'Word Smartify — Learn vocabulary, word by word'
    }
  }, [profile])

  const achievements = useMemo<Achievement[]>(() => {
    if (!stats) return []
    return [
      { id: 'first-word', label: 'First Steps', description: 'Learn your first word', earned: stats.words_learned >= 1 },
      { id: 'streak-7', label: 'On Fire', description: 'Reach a 7-day streak', earned: stats.longest_streak >= 7 },
      { id: 'words-100', label: 'Century', description: 'Learn 100 words', earned: stats.words_learned >= 100 },
      { id: 'master-50', label: 'Word Master', description: 'Master 50 words', earned: stats.words_mastered >= 50 },
      { id: 'xp-1000', label: 'Grinder', description: 'Earn 1,000 XP', earned: stats.total_xp >= 1000 },
      { id: 'xp-5000', label: 'Vocab Titan', description: 'Earn 5,000 XP', earned: stats.total_xp >= 5000 },
    ]
  }, [stats])

  const queries = [profileQuery, statsQuery, progressQuery, bookProgressQuery, booksQuery, testsQuery, badgesQuery]
  if (queries.some((query) => query.isLoading)) return <ProfileSkeleton />
  if (queries.some((query) => query.error)) {
    return (
      <ErrorState
        title="Profile data couldn't be loaded"
        description="Your profile is safe. Try loading it again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }
  if (!profile || !stats || !progressSummary) {
    return (
      <ErrorState
        title="Profile data is unavailable"
        description="We couldn't find the data needed for your profile. Try again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }

  const recentTests = (tests ?? []).slice(0, 3)
  const displayedAchievements = isOwnerUserId(profile.id)
    ? [{ id: 'word-smartify-owner', label: 'Owner', description: 'The Word Smartify owner', earned: true }, ...achievements]
    : achievements
  const earnedCount = displayedAchievements.filter((achievement) => achievement.earned).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        className="flex-row items-center justify-between"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/settings"><Settings className="size-4" aria-hidden /> Settings</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar name={profile.display_name} avatarId={profile.avatar_id} avatarUrl={profile.avatar_url} size="xl" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="font-heading text-2xl font-bold"><OwnerDisplayName userId={profile.id} name={profile.display_name} badges={badges ?? []} /></h2>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="mint" className="gap-1 px-2.5 py-1 text-sm"><Trophy className="size-3.5" aria-hidden /> Level {progressSummary.level.level}</Badge>
              <Badge variant="coral" className="gap-1 px-2.5 py-1 text-sm"><Flame className="size-3.5" aria-hidden /> {stats.current_streak} day streak</Badge>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="font-heading font-semibold">{progressSummary.level.into}/{progressSummary.level.span} XP to level {progressSummary.level.level + 1}</span>
                <span className="tabular-nums">{progressSummary.level.pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border-2 border-foreground bg-card">
                <div className="h-full bg-mint" style={{ width: `${progressSummary.level.pct}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile icon={Zap} value={stats.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={BookOpen} value={stats.words_learned.toLocaleString()} label="Words learned" />
        <StatTile icon={Trophy} value={stats.words_mastered.toLocaleString()} label="Mastered" accent="mint" />
        <StatTile icon={Flame} value={stats.current_streak} label="Streak" accent="coral" />
        <StatTile icon={Flame} value={stats.longest_streak} label="Best streak" accent="coral" className="col-span-2 sm:col-span-1" />
      </div>

      <section>
        <SectionHeader title="Book progress" />
        <div className="grid gap-3 sm:grid-cols-2">
          {(bookProgress ?? []).map((progress) => {
            const book = books?.find((item) => item.id === progress.book_id)
            const percent = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0
            return (
              <Card key={progress.book_id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-heading font-bold">{book?.name ?? progress.book_id}</h3>
                    <BookOpen className="size-5 text-mint" aria-hidden />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{progress.learned.toLocaleString()} / {progress.total.toLocaleString()} learned</span>
                    <span className="font-heading font-bold">{percent}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
                    <div className="h-full bg-mint" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{progress.mastered.toLocaleString()} mastered</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="Achievements" action={<span className="font-heading text-sm font-bold tabular-nums text-muted-foreground">{earnedCount}/{displayedAchievements.length}</span>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayedAchievements.map((achievement) => (
            <Card key={achievement.id} flat className={cn(!achievement.earned && 'opacity-60', achievement.id === 'word-smartify-owner' && 'border-foreground bg-coral text-slate-950 dark:text-slate-950 shadow-brutal-md')}>
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <span className={cn('grid size-12 place-items-center rounded-full border-2 border-foreground shadow-brutal-sm', achievement.id === 'word-smartify-owner' ? 'bg-card text-foreground' : achievement.earned ? 'bg-mint text-mint-foreground' : 'bg-muted text-muted-foreground')}>
                  {achievement.earned ? <Award className="size-6" aria-hidden /> : <Lock className="size-5" aria-hidden />}
                </span>
                <p className={cn('font-heading text-sm font-bold leading-tight', achievement.id === 'word-smartify-owner' && 'text-black dark:text-black')}>{achievement.label}</p>
                <p className={cn('text-pretty text-xs', achievement.id === 'word-smartify-owner' ? 'text-black/80 dark:text-black/80' : 'text-muted-foreground')}>{achievement.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent mock tests" action={<Button asChild variant="ghost" size="sm"><Link href="/mock-tests">View all</Link></Button>} />
        {recentTests.length === 0 ? (
          <EmptyState icon={FileText} title="No mock tests yet" description="Take a timed mock test to gauge how much you&apos;ve retained." action={<Button asChild size="sm"><Link href="/mock-tests">Start a mock test</Link></Button>} />
        ) : (
          <div className="flex flex-col gap-2">
            {recentTests.map((test) => (
              <Card key={test.id} flat className="border-foreground/15">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-md border-2 border-foreground font-heading text-sm font-bold shadow-brutal-sm', test.score >= 80 ? 'bg-mint text-mint-foreground' : test.score >= 50 ? 'bg-muted text-foreground' : 'bg-coral text-coral-foreground')}>{test.score}%</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{test.correct_answers}/{test.total_questions} correct</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3" aria-hidden /> {shortDate(test.created_at.slice(0, 10))}</p>
                  </div>
                  <Target className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-40" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
