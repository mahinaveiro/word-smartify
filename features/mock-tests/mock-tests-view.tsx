'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileText,
  Play,
  ArrowRight,
  Trophy,
  Clock,
  Target,
  Zap,
  X,
  CalendarDays,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { StatTile } from '@/features/shared/stat-tile'
import { QuizCard } from '@/features/session/quiz-card'
import { useToast } from '@/components/ui/toast'
import { formatDuration, shortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { repositories, getActiveUserId } from '@/repositories'
import { useMockTests } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import { XP } from '@/lib/learning-logic'
import type { MockTest, QuizQuestion } from '@/types/database'

const LENGTH_OPTIONS = [10, 20, 30]

type Phase = 'idle' | 'running' | 'summary'

interface Answered {
  question: QuizQuestion
  selected: string | null
  correct: boolean
}

export function MockTestsView() {
  const { data: history, isLoading, mutate } = useMockTests()
  const { revalidateUser } = useActions()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>('idle')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answered[]>([])
  const [starting, setStarting] = useState(false)
  const [result, setResult] = useState<MockTest | null>(null)
  const testIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)

  const start = useCallback(async (count: number) => {
    setStarting(true)
    try {
      const seed = Math.floor(Math.random() * 100000)
      const qs = await repositories.quizzes.getRandomQuestions(count, seed)
      const test = await repositories.mockTests.createMockTest(getActiveUserId(), {
        total_questions: qs.length,
      })
      testIdRef.current = test.id
      startedAtRef.current = Date.now()
      setQuestions(qs)
      setAnswers([])
      setIndex(0)
      setResult(null)
      setPhase('running')
    } finally {
      setStarting(false)
    }
  }, [])

  const current = questions[index]
  const total = questions.length
  const quiz = useQuizEngine(phase === 'running' ? current ?? null : null)

  async function choose(option: string) {
    if (!current) return
    const event = quiz.submit(option)
    if (!event) return
    setAnswers((prev) => [...prev, { question: current, selected: option, correct: event.isCorrect }])
    if (testIdRef.current) {
      await repositories.mockTests.saveMockAnswer(testIdRef.current, {
        question_id: current.id,
        user_answer: option,
        is_correct: event.isCorrect,
      })
    }
  }

  async function next() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      return
    }
    // finalize
    const time = Math.round((Date.now() - startedAtRef.current) / 1000)
    if (testIdRef.current) {
      const finalized = await repositories.mockTests.finalizeMockTest(testIdRef.current, {
        time_taken_seconds: time,
      })
      const correctCount = finalized.correct_answers
      const earnedXp = correctCount * XP.CORRECT_QUIZ
      if (earnedXp > 0) {
        await repositories.stats.addXp(getActiveUserId(), earnedXp)
      }
      setResult(finalized)
      revalidateUser()
      mutate()
      toast({
        title: 'Test complete!',
        description: `You scored ${finalized.score}% and earned +${earnedXp} XP.`,
        tone: 'success',
      })
    }
    setPhase('summary')
  }

  function quit() {
    setPhase('idle')
    testIdRef.current = null
  }

  // ------------------------------------------------------------------ running
  if (phase === 'running' && current) {
    const progressPct = Math.round(((index + (quiz.revealed ? 1 : 0)) / total) * 100)
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-lg flex-col">
        <div className="flex items-center gap-3">
          <IconButton label="Quit test" variant="ghost" onClick={quit}>
            <X />
          </IconButton>
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
            <div
              className="h-full bg-coral transition-[width] duration-normal"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-heading text-sm font-bold tabular-nums">
            {index + 1}/{total}
          </span>
        </div>
        <p className="mt-3 text-center font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Mock test · Question {index + 1}
        </p>
        <div className="flex flex-1 flex-col justify-center py-6">
          <QuizCard question={current} selected={quiz.selected} onSelect={choose} revealed={quiz.revealed} />
        </div>
        <Button size="lg" className="mt-auto w-full" onClick={next} disabled={!quiz.revealed}>
          {index < total - 1 ? 'Next question' : 'Finish test'}
          <ArrowRight className="size-5" aria-hidden />
        </Button>
      </div>
    )
  }

  // ------------------------------------------------------------------ summary
  if (phase === 'summary' && result) {
    const accuracy = result.score
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-6 text-center">
        <span
          className={cn(
            'grid size-20 place-items-center rounded-full border-2 border-foreground shadow-brutal',
            accuracy >= 80 ? 'bg-mint text-mint-foreground' : accuracy >= 50 ? 'bg-muted text-foreground' : 'bg-coral text-coral-foreground',
          )}
        >
          <Trophy className="size-9" aria-hidden />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-bold">Test complete</h1>
          <p className="mt-1 text-muted-foreground">
            You answered {result.correct_answers} of {result.total_questions} correctly.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-3">
          <StatTile icon={Target} value={`${result.score}%`} label="Score" accent="mint" />
          <StatTile icon={Zap} value={`+${result.correct_answers * XP.CORRECT_QUIZ}`} label="XP earned" accent="ink" />
          <StatTile
            icon={Clock}
            value={formatDuration(result.time_taken_seconds ?? 0)}
            label="Time"
            accent="coral"
          />
        </div>

        {/* Answer review */}
        <div className="w-full text-left">
          <SectionHeader title="Review" />
          <div className="flex flex-col gap-2">
            {answers.map((a, i) => (
              <Card key={i} flat className="border-foreground/15">
                <CardContent className="flex items-start gap-3 p-3.5">
                  <span
                    className={cn(
                      'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground text-xs font-bold',
                      a.correct ? 'bg-mint text-mint-foreground' : 'bg-coral text-coral-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-pretty text-sm font-medium">{a.question.question}</p>
                    {!a.correct ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Correct: <span className="font-semibold text-foreground">{a.question.correct_answer}</span>
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button size="lg" variant="outline" className="flex-1" onClick={() => setPhase('idle')}>
            Done
          </Button>
          <Button size="lg" className="flex-1" onClick={() => start(result.total_questions)} loading={starting}>
            Retake
          </Button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------ idle
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assessment"
        title="Mock Tests"
        description="Timed, mixed-question tests that pull from your whole vocabulary."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-coral" aria-hidden />
            <h2 className="font-heading text-base font-bold">Start a new test</h2>
          </div>
          <p className="text-sm text-muted-foreground">Choose how many questions you want to tackle.</p>
          <div className="grid grid-cols-3 gap-3">
            {LENGTH_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                disabled={starting}
                onClick={() => start(count)}
                className="press flex flex-col items-center gap-1 rounded-md border-2 border-foreground bg-card p-4 shadow-brutal-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="font-heading text-2xl font-bold">{count}</span>
                <span className="text-xs text-muted-foreground">questions</span>
              </button>
            ))}
          </div>
          <Button size="lg" onClick={() => start(LENGTH_OPTIONS[0])} loading={starting} className="w-full">
            <Play className="size-5" aria-hidden />
            Quick start ({LENGTH_OPTIONS[0]} questions)
          </Button>
        </CardContent>
      </Card>

      <section>
        <SectionHeader title="History" />
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (history?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests taken yet"
            description="Your completed mock tests and scores will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {history!.map((t) => (
              <Card key={t.id} flat className="border-foreground/15">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-md border-2 border-foreground font-heading text-sm font-bold shadow-brutal-sm',
                      t.score >= 80 ? 'bg-mint text-mint-foreground' : t.score >= 50 ? 'bg-muted text-foreground' : 'bg-coral text-coral-foreground',
                    )}
                  >
                    {t.score}%
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {t.correct_answers}/{t.total_questions} correct
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" aria-hidden />
                        {shortDate(t.created_at.slice(0, 10))}
                      </span>
                      {t.time_taken_seconds != null ? (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" aria-hidden />
                          {formatDuration(t.time_taken_seconds)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
