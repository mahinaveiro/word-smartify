'use client'

import Link from 'next/link'
import { CalendarDays, Clock, FileText, Play } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useMockTests } from '@/hooks/use-data'
import { formatDuration, shortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-provider'
import {
  MOCK_TEST_LENGTHS,
  MOCK_TEST_QUESTION_SECONDS,
  startMockTest,
} from '@/services/mock-test'

export function MockTestsView() {
  const { data: history, error, isLoading, mutate } = useMockTests()
  const router = useRouter()
  const { toast } = useToast()
  const userId = useAuth().user?.id
  const [selectedCount, setSelectedCount] = useState<number>(MOCK_TEST_LENGTHS[0])
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(false)

  async function start() {
    setStarting(true)
    setStartError(false)
    try {
      if (!userId) throw new Error('Please sign in to start a mock test.')
      const test = await startMockTest(userId, selectedCount)
      router.push(`/mock-tests/${test.id}`)
    } catch {
      setStartError(true)
      toast({
        title: 'Could not start test',
        description: 'Please try again.',
        tone: 'error',
      })
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assessment"
        title="Mock Tests"
        description="Test your vocabulary under exam-like conditions."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-coral" aria-hidden />
            <h2 className="font-heading text-base font-bold">Choose a test</h2>
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_TEST_LENGTHS.map((count) => {
              const selected = selectedCount === count
              return (
                <button
                  key={count}
                  type="button"
                  disabled={starting}
                  aria-pressed={selected}
                  onClick={() => setSelectedCount(count)}
                  className={cn(
                    'press flex items-center gap-4 rounded-md border-2 border-foreground px-4 py-3 text-left shadow-brutal-sm transition-colors',
                    selected ? 'bg-mint text-mint-foreground' : 'bg-card hover:bg-muted',
                    starting && 'opacity-60',
                  )}
                >
                  <span className="min-w-16 font-heading text-lg font-bold">{count} questions</span>
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="size-4" aria-hidden />
                    {formatDuration(count * MOCK_TEST_QUESTION_SECONDS)}
                  </span>
                </button>
              )
            })}
          </div>
          {startError ? (
            <ErrorState
              title="Could not start this test"
              description="Your test was not created. Try again."
              onRetry={start}
            />
          ) : null}
          <Button size="lg" onClick={start} loading={starting} className="self-start">
            <Play className="size-5" aria-hidden />
            Start test
          </Button>
        </CardContent>
      </Card>

      <section>
        <SectionHeader title="History" />
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Mock test history couldn't be loaded"
            description="Your completed tests are safe. Try loading the history again."
            onRetry={() => mutate()}
          />
        ) : (history?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests taken yet"
            description="Your completed mock tests and scores will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {history!.map((test) => (
              <Link
                key={test.id}
                href={test.time_taken_seconds == null ? `/mock-tests/${test.id}` : `/mock-tests/${test.id}/result`}
                className="block"
              >
                <Card flat className="border-foreground/15 transition-colors hover:bg-muted">
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <span
                      className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-md border-2 border-foreground font-heading text-sm font-bold shadow-brutal-sm',
                        test.score >= 80
                          ? 'bg-mint text-mint-foreground'
                          : test.score >= 50
                            ? 'bg-muted text-foreground'
                            : 'bg-coral text-coral-foreground',
                      )}
                    >
                      {test.score}%
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {test.correct_answers}/{test.total_questions} correct
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" aria-hidden />
                          {shortDate(test.created_at.slice(0, 10))}
                        </span>
                        {test.time_taken_seconds != null ? (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" aria-hidden />
                            {formatDuration(test.time_taken_seconds)}
                          </span>
                        ) : (
                          <Badge variant="neutral">In progress</Badge>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
