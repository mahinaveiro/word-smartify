'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Trophy, Zap, Sparkles, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { StatTile } from '@/features/shared/stat-tile'
import { useToast } from '@/components/ui/toast'
import { useSessionData, type SessionCard } from './use-session-data'
import { useLevel } from '@/hooks/use-data'
import { useActions, type QuizAnswerResult } from '@/hooks/use-actions'
import { Flashcard } from './flashcard'
import { QuizCard } from './quiz-card'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { XP } from '@/lib/xp'

type Phase = 'flashcards' | 'quiz' | 'summary'

export function SessionView({ levelId }: { levelId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: cards, isLoading, error, mutate } = useSessionData(levelId)
  const levelQuery = useLevel(levelId)
  const { data: level } = levelQuery
  const { recordQuizAnswer, recordSessionProgress, revalidateUser } = useActions()

  const [phase, setPhase] = useState<Phase>('flashcards')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [pendingSaves, setPendingSaves] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [results, setResults] = useState<QuizAnswerResult[]>([])
  const [answerError, setAnswerError] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<{ wordId: string; event: QuizAnswerEvent } | null>(null)
  const [finishError, setFinishError] = useState(false)
  const finishRecorded = useRef(false)
  const pendingSavesRef = useRef(new Set<Promise<QuizAnswerResult>>())
  const failedSavesRef = useRef(new Set<string>())
  const resultsRef = useRef<QuizAnswerResult[]>([])

  const total = cards?.length ?? 0
  const card = cards?.[index]
  const quiz = useQuizEngine(phase === 'quiz' ? card?.question ?? null : null)

  const summary = useMemo(() => {
    const correct = results.filter((r) => r.correct).length
    const xp = results.reduce((s, r) => s + r.xpEarned, 0)
    const learned = results.filter((r) => r.becameLearned).length
    const mastered = results.filter((r) => r.becameMastered).length
    return { correct, xp, learned, mastered }
  }, [results])

  if (isLoading) return <SessionSkeleton />
  if (error || levelQuery.error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <ErrorState
          title="Couldn't load this session"
          description="Your learning progress is safe. Try loading this session again."
          onRetry={() => Promise.all([mutate(), levelQuery.mutate()])}
        />
      </div>
    )
  }
  if (!cards || total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState title="No words to study" description="This level does not have any words available yet." action={<Button onClick={close}>Back to level</Button>} />
      </div>
    )
  }

  const progressPct = phase === 'summary' ? 100 : Math.round(((index + (phase === 'quiz' ? 0.5 : 0)) / total) * 100)

  function close() {
    router.push(`/learn/level/${levelId}`)
  }

  function nextFlashcard() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      setFlipped(false)
    } else {
      // move to quiz
      setPhase('quiz')
      setIndex(0)
    }
  }

  function persistAnswer(wordId: string, event: QuizAnswerEvent) {
    setAnswerError(false)
    setPendingAnswer({ wordId, event })
    failedSavesRef.current.delete(wordId)

    const request = recordQuizAnswer(wordId, event.isCorrect, 'learning')
    pendingSavesRef.current.add(request)
    setPendingSaves((value) => value + 1)

    void request
      .then((res) => {
        resultsRef.current = [...resultsRef.current, res]
        setResults(resultsRef.current)
        setPendingAnswer((previous) => previous?.wordId === wordId ? null : previous)
      })
      .catch(() => {
        failedSavesRef.current.add(wordId)
        setAnswerError(true)
      })
      .finally(() => {
        pendingSavesRef.current.delete(request)
        setPendingSaves((value) => Math.max(0, value - 1))
      })
  }

  function chooseAnswer(option: string) {
    if (!card) return
    const event = quiz.submit(option)
    if (!event) return
    persistAnswer(card.word.id, event)
  }

  function retryAnswer() {
    if (!pendingAnswer) return
    persistAnswer(pendingAnswer.wordId, pendingAnswer.event)
  }

  async function waitForPendingSaves() {
    await Promise.allSettled(Array.from(pendingSavesRef.current))
    if (failedSavesRef.current.size > 0) {
      throw new Error('Some answers could not be saved. Retry them before finishing this session.')
    }
  }

  async function nextQuiz() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      return
    }
    if (finishRecorded.current || finishing) return
    finishRecorded.current = true
    setFinishing(true)
    setFinishError(false)
    try {
      await waitForPendingSaves()
      setResults(resultsRef.current)
      await recordSessionProgress()
      revalidateUser()
      if (resultsRef.current.some((result) => result.goalJustCompleted)) {
        toast({ title: 'Daily goal complete!', description: `+${XP.DAILY_GOAL} XP bonus earned.`, tone: 'success' })
      }
      setPhase('summary')
    } catch {
      finishRecorded.current = false
      setFinishError(true)
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg md:max-w-2xl flex-col px-4 pb-8 pt-4 md:px-6" style={{ paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom)))' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <IconButton label="Close session" variant="ghost" onClick={close}>
          <X />
        </IconButton>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
          <div
            className="h-full bg-mint transition-[width] duration-normal"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-right font-heading text-sm font-bold tabular-nums">
          {phase === 'summary' ? total : Math.min(index + 1, total)}/{total}
        </span>
      </div>

      <p className="mt-3 text-center font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {level?.title ?? 'Session'} · {phase === 'flashcards' ? 'Study' : phase === 'quiz' ? 'Quiz' : 'Summary'}
      </p>

      <div className="flex flex-1 flex-col justify-center py-6">
        {phase === 'flashcards' && card ? (
          <Flashcard word={card.word} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
        ) : phase === 'quiz' && card ? (
          <>
            <QuizCard
              question={card.question}
              selected={quiz.selected}
              onSelect={chooseAnswer}
              revealed={quiz.revealed}
            />
            {answerError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Your progress couldn't be saved"
                description="This answer was not recorded. Your session is paused until you retry."
                onRetry={retryAnswer}
              />
            ) : null}
            {finishError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Your session couldn't be finalized"
                description="Your answers are still here. Try finishing the session again."
                onRetry={nextQuiz}
              />
            ) : null}
          </>
        ) : (
          <SessionSummary summary={summary} total={total} />
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-auto">
        {phase === 'quiz' && pendingSaves > 0 ? (
          <p className="mb-2 text-center text-xs text-muted-foreground">Saving answer in background…</p>
        ) : null}
        {phase === 'flashcards' ? (
          <Button size="lg" className="w-full" onClick={nextFlashcard}>
            {index < total - 1 ? 'Next word' : 'Start quiz'}
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        ) : phase === 'quiz' ? (
          <Button
            size="lg"
            className="w-full"
            onClick={nextQuiz}
            disabled={!quiz.revealed || finishing}
            loading={finishing}
          >
            {index < total - 1 ? 'Next question' : 'Finish'}
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
              Home
            </Button>
            <Button size="lg" className="flex-1" onClick={close}>
              Back to level
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionSummary({
  summary,
  total,
}: {
  summary: { correct: number; xp: number; learned: number; mastered: number }
  total: number
}) {
  const accuracy = total > 0 ? Math.round((summary.correct / total) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="grid size-20 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal">
        <Trophy className="size-9" aria-hidden />
      </span>
      <div>
        <h1 className="font-heading text-3xl font-bold">Session complete</h1>
        <p className="mt-1 text-muted-foreground">
          You answered {summary.correct} of {total} correctly ({accuracy}%).
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <StatTile icon={Zap} value={`+${summary.xp}`} label="XP earned" accent="ink" />
        <StatTile icon={BookOpen} value={summary.learned} label="New words" accent="mint" />
        <StatTile icon={Trophy} value={summary.mastered} label="Mastered" />
        <StatTile icon={Sparkles} value={`${accuracy}%`} label="Accuracy" accent="coral" />
      </div>
    </div>
  )
}

function SessionSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-1 items-center">
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
