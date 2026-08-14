'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { QuizCard } from '@/features/session/quiz-card'
import { useMockTest } from '@/hooks/use-data'
import { formatDuration } from '@/lib/date'
import { getActiveUserId } from '@/repositories'
import { finalizeMockTest, saveMockTestAnswer } from '@/services/mock-test'
import type { MockTestAnswer } from '@/types/database'
import { useQuizEngine } from '@/hooks/use-quiz-engine'

export function MockTestRunView({ testId }: { testId: string }) {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useMockTest(testId)
  const [index, setIndex] = useState(0)
  const [answerMap, setAnswerMap] = useState<Record<string, MockTestAnswer>>({})
  const [localSelections, setLocalSelections] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [answerSaving, setAnswerSaving] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setAnswerMap(data.answerMap)
  }, [data?.test.id])

  useEffect(() => {
    if (data?.test.time_taken_seconds != null) {
      router.replace(`/mock-tests/${testId}/result`)
    }
  }, [data?.test.time_taken_seconds, router, testId])

  useEffect(() => {
    if (!data) return
    const updateElapsed = () => {
      const createdAt = Date.parse(data.test.created_at)
      setElapsed(Math.max(0, Math.floor((Date.now() - createdAt) / 1000)))
    }
    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [data?.test.created_at])

  const current = data?.questions[index] ?? null
  const selectedAnswers = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.entries(answerMap).map(([questionId, answer]) => [questionId, answer.user_answer]),
      ),
      ...localSelections,
    }),
    [answerMap, localSelections],
  )
  const selected = current ? selectedAnswers[current.id] ?? null : null
  const unanswered = data
    ? data.questions.filter((question) => selectedAnswers[question.id] == null).length
    : 0
  const quiz = useQuizEngine(current, { allowChange: true, initialSelected: selected })

  async function choose(option: string) {
    if (!current || answerSaving) return
    const event = quiz.submit(option)
    if (!event) return
    setRunError(null)
    setLocalSelections((previous) => ({ ...previous, [current.id]: option }))
    setAnswerSaving(true)
    try {
      const saved = await saveMockTestAnswer(testId, event)
      setAnswerMap((previous) => ({ ...previous, [current.id]: saved }))
    } catch {
      setRunError('Your answer was not saved. Please select it again.')
    } finally {
      setAnswerSaving(false)
    }
  }

  async function submitTest() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await finalizeMockTest(testId, elapsed, getActiveUserId())
      router.replace(`/mock-tests/${testId}/result`)
    } catch {
      setSubmitError('The test could not be submitted. Please try again.')
      setSubmitting(false)
    }
  }

  if (isLoading) return <MockTestRunSkeleton />
  if (error) return <ErrorState title="Could not load this test" onRetry={() => mutate()} />
  if (!data) {
    return (
      <EmptyState
        title="Test not found"
        description="This mock test is no longer available on this device."
        action={<Button asChild><Link href="/mock-tests">Back to Mock Tests</Link></Button>}
      />
    )
  }
  if (!current) {
    return <ErrorState title="This test has no questions" onRetry={() => mutate()} />
  }

  const progress = Math.round(((index + 1) / data.questions.length) * 100)

  return (
    <>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-5 pb-8 sm:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="shrink-0 px-0">
            <Link href="/mock-tests"><X className="size-5" aria-hidden /> Exit</Link>
          </Button>
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
            <div className="h-full bg-coral transition-[width] duration-normal" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 font-heading text-sm font-bold tabular-nums">
            {index + 1}/{data.questions.length}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Mock test
          </p>
          <span className="flex items-center gap-1 font-heading text-sm font-bold tabular-nums">
            <Clock className="size-4" aria-hidden /> {formatDuration(elapsed)}
          </span>
        </div>

        <Card className="my-6 flex-1">
          <CardContent className="p-5 sm:p-8">
            <QuizCard
              question={current}
              selected={selected}
              onSelect={choose}
              revealed={false}
            />
            {runError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Answer not saved"
                description={runError}
                onRetry={() => setRunError(null)}
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0 || answerSaving}
          >
            <ArrowLeft className="size-4" aria-hidden /> Previous
          </Button>
          <span className="text-center text-xs text-muted-foreground">
            {data.questions.length - unanswered} answered
          </span>
          <Button onClick={() => {
            if (index < data.questions.length - 1) setIndex((value) => value + 1)
            else setSubmitOpen(true)
          }} disabled={answerSaving} loading={answerSaving}>
            {index < data.questions.length - 1 ? 'Next' : 'Review & submit'}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Modal
        open={submitOpen}
        onClose={() => { if (!submitting) setSubmitOpen(false) }}
        title="Submit test?"
        description={
          unanswered > 0
            ? `You still have ${unanswered} unanswered questions.`
            : 'All questions are answered and ready to submit.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
              Continue test
            </Button>
            <Button onClick={submitTest} loading={submitting}>
              Submit test
            </Button>
          </>
        }
      >
        {submitError ? (
          <ErrorState
            className="py-6"
            title="Could not submit"
            description={submitError}
            onRetry={() => setSubmitError(null)}
          />
        ) : null}
      </Modal>
    </>
  )
}

function MockTestRunSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-5 sm:px-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="flex-1 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
