'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Trophy, Zap, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatTile } from '@/features/shared/stat-tile'
import { useToast } from '@/components/ui/toast'
import { useReviewSession } from './use-review-session'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import { useActions, type QuizAnswerResult } from '@/hooks/use-actions'
import { QuizCard } from '@/features/session/quiz-card'

type Phase = 'quiz' | 'summary'

export function ReviewView() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: cards, isLoading, error, mutate } = useReviewSession()
  const { recordQuizAnswer, recordSessionProgress, revalidateUser } = useActions()

  const [phase, setPhase] = useState<Phase>('quiz')
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [results, setResults] = useState<QuizAnswerResult[]>([])
  const finishRecorded = useRef(false)

  const total = cards?.length ?? 0
  const card = cards?.[index]
  const quiz = useQuizEngine(phase === 'quiz' ? card?.question ?? null : null)

  const summary = useMemo(() => {
    const correct = results.filter((r) => r.correct).length
    const xp = results.reduce((s, r) => s + r.xpEarned, 0)
    return { correct, xp }
  }, [results])

  if (isLoading) return <ReviewSkeleton />

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState
          icon={RotateCcw}
          title="Couldn't load your review"
          description="We could not load your review queue. Please try again."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to dashboard
              </Button>
              <Button onClick={() => mutate()}>Retry</Button>
            </div>
          }
        />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState
          icon={Trophy}
          title="Nothing due right now"
          description="You're all caught up. Come back later, or keep learning new words."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to dashboard
              </Button>
              <Button onClick={() => router.push('/learn')}>Go to Learn</Button>
            </div>
          }
        />
      </div>
    )
  }

  function close() {
    router.push('/dashboard')
  }

  async function chooseAnswer(option: string) {
    if (!card) return
    const event = quiz.submit(option)
    if (!event) return
    setBusy(true)
    try {
      const res = await recordQuizAnswer(card.word.id, event.isCorrect)
      setResults((prev) => [...prev, res])
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      return
    }
    if (finishRecorded.current || finishing) return
    finishRecorded.current = true
    setFinishing(true)
    try {
      const learned = results.filter((r) => r.becameLearned).length
      const reviews = results.length - learned
      const res = await recordSessionProgress({ newWords: learned, reviews })
      revalidateUser()
      if (res.goalJustCompleted) {
        toast({ title: 'Daily goal complete!', description: '+25 XP bonus earned.', tone: 'success' })
      }
      setPhase('summary')
    } catch {
      finishRecorded.current = false
    } finally {
      setFinishing(false)
    }
  }

  const progressPct = phase === 'summary' ? 100 : Math.round((index / total) * 100)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <IconButton label="Close review" variant="ghost" onClick={close}>
          <X />
        </IconButton>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
          <div
            className="h-full bg-coral transition-[width] duration-normal"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-right font-heading text-sm font-bold tabular-nums">
          {phase === 'summary' ? total : index + 1}/{total}
        </span>
      </div>

      <p className="mt-3 text-center font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Review · {phase === 'quiz' ? 'Quiz' : 'Summary'}
      </p>

      <div className="flex flex-1 flex-col justify-center py-6">
        {phase === 'quiz' && card ? (
          <QuizCard
            question={card.question}
            selected={quiz.selected}
            onSelect={chooseAnswer}
            revealed={quiz.revealed}
          />
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="grid size-20 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal">
              <Trophy className="size-9" aria-hidden />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-bold">Review complete</h1>
              <p className="mt-1 text-muted-foreground">
                You answered {summary.correct} of {total} correctly.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <StatTile icon={Zap} value={`+${summary.xp}`} label="XP earned" accent="ink" />
              <StatTile icon={Trophy} value={summary.correct} label="Correct" accent="mint" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto">
        {phase === 'quiz' ? (
          <Button
            size="lg"
            className="w-full"
            onClick={next}
            disabled={!quiz.revealed || busy || finishing}
            loading={busy || finishing}
          >
            {index < total - 1 ? 'Next word' : 'Finish'}
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={close}>
            Back to dashboard
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewSkeleton() {
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
