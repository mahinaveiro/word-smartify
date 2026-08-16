'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Minus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMockTest } from '@/hooks/use-data'

export function MockTestReviewView({ testId }: { testId: string }) {
  const { data, error, isLoading, mutate } = useMockTest(testId)

  if (isLoading) return <MockTestReviewSkeleton />
  if (error) {
    return (
      <ErrorState
        title="This review couldn't be loaded"
        description="Your submitted test is safe. Try loading the review again."
        onRetry={() => mutate()}
      />
    )
  }
  if (!data) {
    return (
      <EmptyState
        title="Test not found"
        description="This mock test is no longer available on this device."
        action={<Button asChild><Link href="/mock-tests">Back to Mock Tests</Link></Button>}
      />
    )
  }
  if (data.test.time_taken_seconds == null) {
    return (
      <EmptyState
        title="Test still in progress"
        description="Finish the test before reviewing its answers."
        action={<Button asChild><Link href={`/mock-tests/${testId}`}>Continue test</Link></Button>}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Review mistakes"
        leading={<BackButton href={`/mock-tests/${testId}/result`} label="Back to result" />}
      />

      <div className="flex flex-col gap-3">
        {data.questions.map((question, index) => {
          const answer = data.answerMap[question.id]
          const status = answer?.user_answer == null ? 'skipped' : answer.is_correct ? 'correct' : 'incorrect'
          const statusConfig = statusDetails[status]
          const StatusIcon = statusConfig.icon

          return (
            <Card key={question.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card font-heading text-xs font-bold">
                      {index + 1}
                    </span>
                    <h2 className="font-heading font-bold leading-snug">{question.question}</h2>
                  </div>
                  <Badge variant={statusConfig.variant}><StatusIcon className="size-3" aria-hidden /> {statusConfig.label}</Badge>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p className="rounded-md border-2 border-foreground/15 bg-muted/50 p-3">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer</span>
                    <span className="mt-1 block font-medium">{answer?.user_answer ?? 'Skipped'}</span>
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
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/mock-tests/${testId}/result`}><ArrowLeft className="size-4" aria-hidden /> Back to Result</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/mock-tests">Back to Mock Tests</Link>
        </Button>
      </div>
    </div>
  )
}

const statusDetails = {
  correct: { label: 'Correct', variant: 'mint' as const, icon: Check },
  incorrect: { label: 'Incorrect', variant: 'coral' as const, icon: X },
  skipped: { label: 'Skipped', variant: 'muted' as const, icon: Minus },
}

function MockTestReviewSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-12 w-64" />
      {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-48 w-full" />)}
    </div>
  )
}
