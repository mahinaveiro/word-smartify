'use client'

import Link from 'next/link'
import { BookOpen, Check, Clock, ListChecks, Target, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/features/shared/stat-tile'
import { useMockTest } from '@/hooks/use-data'
import { formatDuration } from '@/lib/date'

export function MockTestResultView({ testId }: { testId: string }) {
  const { data, error, isLoading, mutate } = useMockTest(testId)

  if (isLoading) return <MockTestResultSkeleton />
  if (error) {
    return (
      <ErrorState
        title="This mock test result couldn't be loaded"
        description="Your submitted test is safe. Try loading the result again."
        onRetry={() => mutate()}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState
        title="Result not found"
        description="This mock test is no longer available on this device."
        action={<BackButton href="/mock-tests" label="Back to mock tests" />}
      />
    )
  }
  if (data.test.time_taken_seconds == null) {
    return (
      <EmptyState
        title="Test still in progress"
        description="Finish the test before viewing its result."
        action={<Button asChild><Link href={`/mock-tests/${testId}`}>Continue test</Link></Button>}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Mock test result"
        actions={
          <BackButton href="/mock-tests" label="Back to mock tests" />
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="font-heading text-5xl font-bold">
                {data.correct}/{data.test.total_questions}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Raw score {formatRawScore(data.rawScore)} · {data.test.score}%
              </p>
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="size-4 text-coral" aria-hidden /> +{data.earnedXp} XP
            </p>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
            <div className="h-full bg-mint" style={{ width: `${Math.max(0, Math.min(100, data.test.score))}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <StatTile icon={Target} value={formatRawScore(data.rawScore)} label="Raw score" accent="ink" />
        <StatTile icon={Target} value={`${data.test.score}%`} label="Percentage" />
        <StatTile icon={Check} value={data.correct} label="Correct" accent="mint" />
        <StatTile icon={X} value={data.incorrect} label="Incorrect" accent="coral" />
        <StatTile icon={BookOpen} value={data.unanswered} label="Unanswered" />
        <StatTile icon={Clock} value={formatDuration(data.test.time_taken_seconds)} label="Time" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-foreground bg-mint">
              <ListChecks className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">Review your answers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                See every question, your response, the correct answer, and whether you skipped it.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/mock-tests/${testId}/review`}>Review mistakes</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 justify-center sm:justify-start">
          <BackButton href="/mock-tests" label="Back to mock tests" />
        </div>
        <Button asChild className="flex-1">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

function formatRawScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function MockTestResultSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
