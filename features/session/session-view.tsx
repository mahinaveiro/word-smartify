'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Trophy, Zap, Sparkles, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { StatTile } from '@/features/shared/stat-tile'
import { useToast } from '@/components/ui/toast'
import { useSessionData, type SessionCard } from './use-session-data'
import { useLevel } from '@/hooks/use-data'
import { useActions, type QuizAnswerResult } from '@/hooks/use-actions'
import { Flashcard } from './flashcard'
import { QuizCard } from './quiz-card'

type Phase = 'flashcards' | 'quiz' | 'summary'

export function SessionView({ levelId }: { levelId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: cards, isLoading, error, mutate } = useSessionData(levelId)
  const { data: level } = useLevel(levelId)
  const { recordQuizAnswer, recordSessionProgress, revalidateUser } = useActions()

  const [phase, setPhase] = useState<Phase>('flashcards')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<QuizAnswerResult[]>([])

  const total = cards?.length ?? 0

  const summary = useMemo(() => {
    const correct = results.filter((r) => r.correct).length
    const xp = results.reduce((s, r) => s + r.xpEarned, 0)
    const learned = results.filter((r) => r.becameLearned).length
    const mastered = results.filter((r) => r.becameMastered).length
    return { correct, xp, learned, mastered }
  }, [results])

  if (isLoading) return <SessionSkeleton />
  if (error || !cards || total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <ErrorState title="Couldn't start session" description="This level has no words to study." onRetry={() => mutate()} />
      </div>
    )
  }

  const card = cards[index]
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
      setSelected(null)
      setRevealed(false)
    }
  }

  async function chooseAnswer(option: string) {
    if (revealed) return
    setSelected(option)
    setRevealed(true)
    setBusy(true)
    const correct = option === card.question.correct_answer
    try {
      const res = await recordQuizAnswer(card.word.id, correct)
      setResults((prev) => [...prev, res])
    } finally {
      setBusy(false)
    }
  }

  async function nextQuiz() {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      // finish: record session-level progress
      const learned = results.filter((r) => r.becameLearned).length
      const reviews = results.length - learned
      const res = await recordSessionProgress({ newWords: learned, reviews })
      revalidateUser()
      if (res.goalJustCompleted) {
        toast({ title: 'Daily goal complete!', description: '+25 XP bonus earned.', tone: 'success' })
      }
      setPhase('summary')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-4">
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
        {phase === 'flashcards' ? (
          <Flashcard word={card.word} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
        ) : phase === 'quiz' ? (
          <QuizCard
            question={card.question}
            selected={selected}
            onSelect={chooseAnswer}
            revealed={revealed}
          />
        ) : (
          <SessionSummary summary={summary} total={total} />
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-auto">
        {phase === 'flashcards' ? (
          <Button size="lg" className="w-full" onClick={nextFlashcard}>
            {index < total - 1 ? 'Next word' : 'Start quiz'}
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        ) : phase === 'quiz' ? (
          <Button size="lg" className="w-full" onClick={nextQuiz} disabled={!revealed || busy} loading={busy}>
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
