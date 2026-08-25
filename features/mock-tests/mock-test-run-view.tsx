'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, ShieldAlert, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useAuth } from '@/features/auth/auth-provider'
import { MOCK_TEST_QUESTION_SECONDS } from '@/services/mock-test'
import { callSecureAction } from '@/lib/secure-action'
import type { MockTestAnswer } from '@/types/database'
import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import { MockTestQuestionNavigator } from './mock-test-question-navigator'

type SecurityState = 'preparing' | 'active' | 'needs-fullscreen' | 'cancelling' | 'needs-cancel'

export function MockTestRunView({ testId }: { testId: string }) {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useMockTest(testId)
  const userId = useAuth().user?.id
  const [index, setIndex] = useState(0)
  const [savedAnswerMap, setSavedAnswerMap] = useState<Record<string, MockTestAnswer>>({})
  const [localSelections, setLocalSelections] = useState<Record<string, string>>({})
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<Record<string, boolean>>({})
  const [starredQuestionIds, setStarredQuestionIds] = useState<Record<string, boolean>>({})
  const [elapsed, setElapsed] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [pendingAnswer, setPendingAnswer] = useState<{ questionId: string; event: QuizAnswerEvent } | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [securityState, setSecurityState] = useState<SecurityState>('preparing')
  const [securityMessage, setSecurityMessage] = useState('Preparing a secure fullscreen exam.')
  const securityStateRef = useRef<SecurityState>('preparing')
  const intentionalLeaveRef = useRef(false)
  const pendingSavesRef = useRef(new Set<Promise<MockTestAnswer>>())
  const saveQueuesRef = useRef(new Map<string, Promise<void>>())

  useEffect(() => {
    if (data?.test.time_taken_seconds != null) {
      router.replace(`/mock-tests/${testId}/result`)
    }
  }, [data?.test.time_taken_seconds, router, testId])

  const cancelExam = useCallback(async (reason: string) => {
    if (securityStateRef.current === 'cancelling') return
    securityStateRef.current = 'cancelling'
    setSecurityState('cancelling')
    setSecurityMessage(reason)

    if (!userId) {
      securityStateRef.current = 'needs-cancel'
      setSecurityState('needs-cancel')
      setSecurityMessage('You must be signed in to cancel this exam safely.')
      return
    }

    try {
      await callSecureAction('cancel-mock-test', { testId })
      router.replace('/mock-tests')
    } catch {
      securityStateRef.current = 'needs-cancel'
      setSecurityState('needs-cancel')
      setSecurityMessage('The exam could not be cancelled automatically. Try again before leaving this page.')
    }
  }, [router, testId, userId])

  const enterFullscreen = useCallback(async () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      securityStateRef.current = 'active'
      setSecurityState('active')
      setSecurityMessage('')
      return
    }

    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      securityStateRef.current = 'active'
      setSecurityState('active')
      setSecurityMessage('')
    } catch {
      securityStateRef.current = 'needs-fullscreen'
      setSecurityState('needs-fullscreen')
      setSecurityMessage('Fullscreen is required to start this exam. Use the button below and allow fullscreen in your browser.')
    }
  }, [])

  useEffect(() => {
    if (!data || data.test.time_taken_seconds != null) return

    const handleVisibilityChange = () => {
      if (document.hidden && securityStateRef.current === 'active') {
        void cancelExam('The exam was cancelled because you left the exam window.')
      }
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && securityStateRef.current === 'active') {
        void cancelExam('The exam was cancelled because fullscreen mode was exited.')
      }
    }
    const handlePageHide = () => {
      if (securityStateRef.current === 'active' && !intentionalLeaveRef.current) {
        void cancelExam('The exam was cancelled because the page was left.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('pagehide', handlePageHide)

    let initialFullscreenTimer: number | undefined
    if (document.fullscreenElement) {
      initialFullscreenTimer = window.setTimeout(() => {
        if (securityStateRef.current === 'preparing') {
          securityStateRef.current = 'active'
          setSecurityState('active')
          setSecurityMessage('')
        }
      }, 0)
    } else {
      initialFullscreenTimer = window.setTimeout(() => {
        void enterFullscreen()
      }, 0)
    }

    return () => {
      if (initialFullscreenTimer !== undefined) window.clearTimeout(initialFullscreenTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [cancelExam, data, enterFullscreen])

  const createdAt = data?.test.created_at
  const totalDurationSeconds = data ? data.test.total_questions * MOCK_TEST_QUESTION_SECONDS : 0
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsed)

  useEffect(() => {
    if (!createdAt) return
    const updateElapsed = () => {
      const createdAtMs = Date.parse(createdAt)
      setElapsed(Math.min(totalDurationSeconds, Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000))))
    }
    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [createdAt, totalDurationSeconds])

  const answerMap = { ...(data?.answerMap ?? {}), ...savedAnswerMap }
  const current = data?.questions[index] ?? null
  const selectedAnswers = {
    ...Object.fromEntries(
      Object.entries(answerMap).map(([questionId, answer]) => [questionId, answer.user_answer]),
    ),
    ...localSelections,
  }
  const selected = current ? selectedAnswers[current.id] ?? null : null
  const unanswered = data
    ? data.questions.filter((question) => selectedAnswers[question.id] == null).length
    : 0
  const quiz = useQuizEngine(current, { allowChange: true, initialSelected: selected })

  function toggleStar(questionId: string) {
    setStarredQuestionIds((previous) => ({
      ...previous,
      [questionId]: !previous[questionId],
    }))
  }

  function goNext() {
    if (current) {
      setSkippedQuestionIds((previous) => {
        const next = { ...previous }
        if (selectedAnswers[current.id] == null) next[current.id] = true
        else delete next[current.id]
        return next
      })
    }

    if (index < data!.questions.length - 1) setIndex((value) => value + 1)
    else setSubmitOpen(true)
  }

  async function persistAnswer(questionId: string, event: QuizAnswerEvent) {
    setRunError(null)
    setPendingAnswer({ questionId, event })

    const previous = saveQueuesRef.current.get(questionId) ?? Promise.resolve()
    const request = previous
      .catch(() => undefined)
      .then(() => callSecureAction<MockTestAnswer>('save-mock-answer', { testId, event }))
    const queueTail = request.then(() => undefined, () => undefined)
    saveQueuesRef.current.set(questionId, queueTail)
    pendingSavesRef.current.add(request)

    try {
      const saved = await request
      setSavedAnswerMap((previousAnswers) => ({ ...previousAnswers, [questionId]: saved }))
      setLocalSelections((previousSelections) => {
        if (previousSelections[questionId] !== event.selectedAnswer) return previousSelections
        const next = { ...previousSelections }
        delete next[questionId]
        return next
      })
      setPendingAnswer((previousAnswer) => (
        previousAnswer?.event.questionId === event.questionId ? null : previousAnswer
      ))
    } catch {
      setRunError('Your answer could not be saved. Retry it before submitting the exam.')
    } finally {
      pendingSavesRef.current.delete(request)
      if (saveQueuesRef.current.get(questionId) === queueTail) saveQueuesRef.current.delete(questionId)
    }
  }

  function choose(option: string) {
    if (!current) return
    const event = quiz.submit(option)
    if (!event) return
    setLocalSelections((previous) => ({ ...previous, [current.id]: event.selectedAnswer }))
    setSkippedQuestionIds((previous) => {
      if (!previous[current.id]) return previous
      const next = { ...previous }
      delete next[current.id]
      return next
    })
    void persistAnswer(current.id, event)
  }

  function retryAnswer() {
    if (!pendingAnswer) return
    void persistAnswer(pendingAnswer.questionId, pendingAnswer.event)
  }

  async function submitTest() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (!userId) throw new Error('Please sign in to submit a mock test.')
      const pendingResults = await Promise.allSettled(Array.from(pendingSavesRef.current))
      if (pendingResults.some((result) => result.status === 'rejected') || runError) {
        throw new Error('Some answers are not saved yet. Retry the failed answer before submitting.')
      }
      await callSecureAction('finalize-mock-test', { testId, timeTakenSeconds: elapsed })
      intentionalLeaveRef.current = true
      router.replace(`/mock-tests/${testId}/result`)
    } catch (submitFailure) {
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : 'The test could not be submitted. Please try again.')
      setSubmitting(false)
    }
  }

  if (isLoading) return <MockTestRunSkeleton />
  if (error) {
    return (
      <ErrorState
        title="This mock test couldn't be loaded"
        description="Your saved answers are safe. Try loading the test again."
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
  if (!current) {
    return (
      <ErrorState
        title="This test has no questions"
        description="The test data is incomplete. Try loading it again."
        onRetry={() => mutate()}
      />
    )
  }
  if (securityState !== 'active') {
    return (
      <SecurityGate
        state={securityState}
        message={securityMessage}
        onEnterFullscreen={() => void enterFullscreen()}
        onRetryCancellation={() => void cancelExam('Retrying exam cancellation.')}
        onCancel={() => void cancelExam('You chose not to continue in fullscreen mode.')}
      />
    )
  }

  const progress = Math.round(((index + 1) / data.questions.length) * 100)

  return (
    <>
      <div
        className="mx-auto flex min-h-dvh max-w-2xl select-none flex-col px-4 py-5 pb-8 sm:px-6"
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-0"
            onClick={() => void cancelExam('The exam was cancelled because you exited it.')}
          >
            <X className="size-5" aria-hidden /> Exit
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
            <Clock className="size-4" aria-hidden /> {formatDuration(remainingSeconds)}
          </span>
        </div>

        <Card className="my-6 flex-1">
          <CardContent className="p-5 sm:p-8">
            <QuizCard
              question={current}
              selected={selected}
              onSelect={choose}
              revealed={false}
              mode="mock_test"
              secure
              canNext={!submitting}
              onNext={goNext}
              canPrevious={index > 0 && !submitting}
              onPrevious={() => setIndex((value) => Math.max(0, value - 1))}
              onToggleStar={() => toggleStar(current.id)}
              isStarred={Boolean(starredQuestionIds[current.id])}
            />
            {runError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Answer not saved"
                description={runError}
                onRetry={retryAnswer}
              />
            ) : null}
            <MockTestQuestionNavigator
              questions={data.questions}
              currentIndex={index}
              skippedQuestionIds={skippedQuestionIds}
              starredQuestionIds={starredQuestionIds}
              onSelect={(questionIndex) => setIndex(questionIndex)}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
          >
            <ArrowLeft className="size-4" aria-hidden /> Previous
          </Button>
          <span className="text-center text-xs text-muted-foreground">
            {data.questions.length - unanswered} answered
          </span>
          <Button onClick={goNext} disabled={submitting}>
            {index < data.questions.length - 1 ? 'Next' : 'Submit'}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Modal
        open={submitOpen}
        onClose={() => { if (!submitting) setSubmitOpen(false) }}
        title="Submit mock test?"
        description={
          unanswered > 0
            ? `You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}.`
            : 'All questions are answered and ready to submit.'
        }
        footer={(
          <>
            <Button
              variant={unanswered > 0 ? 'primary' : 'outline'}
              onClick={() => setSubmitOpen(false)}
              disabled={submitting}
            >
              Continue test
            </Button>
            <Button variant={unanswered > 0 ? 'outline' : 'primary'} onClick={submitTest} loading={submitting}>
              Submit
            </Button>
          </>
        )}
      >
        {submitError ? (
          <ErrorState
            className="py-6"
            title="Could not submit"
            description={submitError}
            onRetry={submitTest}
          />
        ) : null}
      </Modal>
    </>
  )
}

function SecurityGate({
  state,
  message,
  onEnterFullscreen,
  onRetryCancellation,
  onCancel,
}: {
  state: SecurityState
  message: string
  onEnterFullscreen: () => void
  onRetryCancellation: () => void
  onCancel: () => void
}) {
  const requiresFullscreen = state === 'preparing' || state === 'needs-fullscreen'
  const cancelling = state === 'cancelling'

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-4 py-6 sm:px-6">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-5 p-6 text-center sm:p-10">
          <span className="grid size-14 place-items-center rounded-full border-2 border-foreground bg-coral text-coral-foreground">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold">
              {cancelling ? 'Cancelling exam' : requiresFullscreen ? 'Fullscreen required' : 'Exam cancellation needs attention'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {requiresFullscreen ? (
              <Button onClick={onEnterFullscreen}>Enter fullscreen</Button>
            ) : state === 'needs-cancel' ? (
              <Button onClick={onRetryCancellation}>Retry cancellation</Button>
            ) : null}
            {!cancelling ? (
              <Button variant="outline" onClick={onCancel}>Cancel exam</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
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
