'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen, Check, Clock, Target, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHeader } from '@/components/ui/section-header'
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
        action={<Button asChild><Link href="/mock-tests">Back to Mock Tests</Link></Button>}
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
        eyebrow="Assessment complete"
        title="Mock test result"
        description="A clear look at what you knew and what to review next."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/mock-tests"><ArrowLeft className="size-4" aria-hidden /> Mock Tests</Link>
          </Button>
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
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="size-4 text-coral" aria-hidden /> +{data.earnedXp} XP
            </p>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
            <div className="h-full bg-mint" style={{ width: `${data.test.score}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile icon={Target} value={`${data.test.score}%`} label="Percentage" accent="ink" />
        <StatTile icon={Check} value={data.correct} label="Correct" accent="mint" />
        <StatTile icon={X} value={data.incorrect} label="Incorrect" accent="coral" />
        <StatTile icon={BookOpen} value={data.unanswered} label="Unanswered" />
        <StatTile icon={Clock} value={formatDuration(data.test.time_taken_seconds)} label="Time" className="col-span-2 sm:col-span-1" />
      </div>

      <section id="mistakes">
        <SectionHeader title="Review mistakes" />
        {data.mistakes.length === 0 ? (
          <EmptyState
            icon={Check}
            title="Nothing to review"
            description="You answered every question correctly."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {data.mistakes.map(({ question, answer }, index) => (
              <Card key={question.id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-foreground bg-coral font-heading text-xs font-bold text-coral-foreground">
                      {index + 1}
                    </span>
                    <h3 className="font-heading font-bold leading-snug">{question.question}</h3>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p className="rounded-md border-2 border-foreground/15 bg-muted/50 p-3">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer</span>
                      <span className="mt-1 block font-medium">{answer?.user_answer ?? 'Not answered'}</span>
                    </p>
                    <p className="rounded-md border-2 border-foreground/15 bg-mint/20 p-3">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correct answer</span>
                      <span className="mt-1 block font-medium">{question.correct_answer}</span>
                    </p>
                  </div>
                  {question.explanation ? (
                    <p className="border-t-2 border-foreground/10 pt-3 text-sm leading-relaxed text-muted-foreground">
                      {question.explanation}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/mock-tests"><ArrowLeft className="size-4" aria-hidden /> Back to Mock Tests</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

function MockTestResultSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
