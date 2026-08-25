'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Check, Clock, ListChecks, Loader2, Share2, Target, X, Zap } from 'lucide-react'
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
import { trackProductEvent } from '@/lib/product-analytics'
import { buildMockTestSharePayload, shareMockTestResult } from '@/lib/mock-test-share'

export function MockTestResultView({ testId }: { testId: string }) {
  const { data, error, isLoading, mutate } = useMockTest(testId)
  const [isSharing, setIsSharing] = useState(false)
  const [shareMessage, setShareMessage] = useState<string | null>(null)

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

  const shareData = {
    correct: data.correct,
    total: data.test.total_questions,
    score: data.test.score,
    mistakes: data.mistakes.length,
  }

  async function handleShare() {
    setIsSharing(true)
    setShareMessage(null)
    try {
      const result = await shareMockTestResult(buildMockTestSharePayload(shareData))
      if (result !== 'cancelled') {
        trackProductEvent('mock_test_shared', { method: result })
        setShareMessage(result === 'shared' ? 'Share sheet opened.' : 'Result copied. Paste it into WhatsApp or Messenger.')
      }
    } catch {
      setShareMessage('Couldn’t share this result. Try again.')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Mock test result"
        leading={<BackButton href="/mock-tests" label="Back to mock tests" />}
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Zap className="size-4 text-coral" aria-hidden /> +{data.earnedXp} XP
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={handleShare}
                disabled={isSharing}
                aria-label="Share mock-test result"
              >
                {isSharing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
                <span className="hidden sm:inline">Share result</span>
              </Button>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
            <div className="h-full bg-mint" style={{ width: `${Math.max(0, Math.min(100, data.test.score))}%` }} />
          </div>
          {shareMessage ? <p className="text-xs font-semibold text-muted-foreground" role="status" aria-live="polite">{shareMessage}</p> : null}
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

      {data.mistakes.length > 0 ? (
        <Card flat className="border-coral/40 bg-coral/10">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-foreground bg-coral">
                <Target className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-base font-bold">Recover missed words</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.mistakes.length} word{data.mistakes.length === 1 ? '' : 's'} from this test need another try.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0 bg-card">
              <Link href={`/review/weak?test=${encodeURIComponent(testId)}`}>Start recovery</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-3">
        <Button asChild size="sm" variant="outline" className="min-w-0 flex-1 px-3 text-sm">
          <Link href="/mock-tests"><ArrowLeft className="size-4" aria-hidden /> Back to Mock Tests</Link>
        </Button>
        <Button asChild size="sm" className="min-w-0 flex-1 px-3 text-sm">
          <Link href="/dashboard">Back to Dashboard</Link>
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
