'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Sparkles, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { StatTile } from '@/features/shared/stat-tile'
import { QuizCard } from '@/features/session/quiz-card'
import { useToast } from '@/components/ui/toast'
import { useChallengeSession } from './use-challenge-session'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import { useActions, type QuizAnswerResult } from '@/hooks/use-actions'
import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { useDailyProgress } from '@/hooks/use-data'
import { todayISO } from '@/lib/date'

type Phase = 'quiz' | 'summary'

export function ChallengeView() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: cards, isLoading, error, mutate } = useChallengeSession()
  const dailyQuery = useDailyProgress(todayISO())
  const { data: daily } = dailyQuery
  const { recordQuizAnswer, completeDailyChallenge, revalidateUser } = useActions()
  const [localPhase, setLocalPhase] = useState<Phase>('quiz')
  const phase: Phase = daily?.challenge_completed ? 'summary' : localPhase
  const [index, setIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [finishing, setFinishing] = useState(false)
  const [results, setResults] = useState<QuizAnswerResult[]>([])
  const answeredIds = useRef<string[]>([])
  const saveQueuesRef = useRef<Map<string, Promise<boolean>>>(new Map())
  const failedAnswersRef = useRef<Map<string, QuizAnswerEvent>>(new Map())
  const [answerError, setAnswerError] = useState(false)
  const [finishError, setFinishError] = useState(false)


  const total = cards?.length ?? 0
  const card = cards?.[index]
  const selectedAnswer = card ? selectedAnswers[card.question.id] ?? null : null
  const quiz = useQuizEngine(
    phase === 'quiz' ? card?.question ?? null : null,
    { initialSelected: selectedAnswer, initialRevealed: selectedAnswer !== null },
  )

  if (isLoading) return <ChallengeSkeleton />
  if (dailyQuery.error) {
    return (
      <ErrorState
        title="Daily challenge status couldn't be loaded"
        description="Your challenge progress is safe. Try loading it again."
        onRetry={() => dailyQuery.mutate()}
      />
    )
  }
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState
          icon={Sparkles}
          title="Couldn&apos;t load your challenge"
          description="Try loading the challenge again."
          action={<div className="flex gap-2"><Button variant="outline" onClick={() => router.push('/dashboard')}>Back</Button><Button onClick={() => mutate()}>Retry</Button></div>}
        />
      </div>
    )
  }
  if (total === 0 && phase !== 'summary') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState
          icon={Sparkles}
          title="Build your challenge first"
          description="Explore a fresh set of real Word Smart vocabulary with a short daily quiz."
          action={<Button onClick={() => router.push('/dashboard')}>Back to dashboard</Button>}
        />
      </div>
    )
  }

  function persistAnswer(wordId: string, event: QuizAnswerEvent) {
    setAnswerError(false)
    if (!answeredIds.current.includes(wordId)) answeredIds.current = [...answeredIds.current, wordId]
    if (saveQueuesRef.current.has(wordId)) return
    const save = (async () => {
      try {
        const result = await recordQuizAnswer(wordId, event.isCorrect, 'challenge')
        failedAnswersRef.current.delete(wordId)
        setResults((previous) => [...previous, result])
        return true
      } catch {
        failedAnswersRef.current.set(wordId, event)
        setAnswerError(true)
        return false
      } finally {
        saveQueuesRef.current.delete(wordId)
      }
    })()
    saveQueuesRef.current.set(wordId, save)
    void save.catch(() => undefined)
  }

  function chooseAnswer(option: string) {
    if (!card) return
    const event = quiz.submit(option)
    if (!event) return
    setSelectedAnswers((previous) => ({ ...previous, [card.question.id]: event.selectedAnswer }))
    persistAnswer(card.word.id, event)
  }

  async function retryFailedAnswers() {
    const failed = [...failedAnswersRef.current.entries()]
    if (failed.length === 0) return
    setAnswerError(false)
    failed.forEach(([wordId, event]) => persistAnswer(wordId, event))
    await Promise.all([...saveQueuesRef.current.values()])
  }

  async function waitForAnswerSaves() {
    const pending = [...saveQueuesRef.current.values()]
    const results = await Promise.all(pending)
    return results.every(Boolean) && failedAnswersRef.current.size === 0
  }

  async function next() {
    if (index < total - 1) {
      setIndex((current) => current + 1)
      return
    }
    if (finishing) return
    setFinishing(true)
    setFinishError(false)
    try {
      const savesComplete = await waitForAnswerSaves()
      if (!savesComplete) {
        setAnswerError(true)
        return
      }
      await completeDailyChallenge([...new Set(answeredIds.current)])
      revalidateUser()
      toast({ title: 'Challenge complete!', description: '+15 XP earned.', tone: 'success' })
      setLocalPhase('summary')
    } catch {
      setFinishError(true)
    } finally {
      setFinishing(false)
    }
  }

  const correct = results.filter((result) => result.correct).length
  const xp = results.reduce((sum, result) => sum + result.xpEarned, 0)
  const done = phase === 'summary' || daily?.challenge_completed

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg md:max-w-2xl flex-col px-4 pb-8 pt-4 md:px-6" style={{ paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom)))' }}>
      <div className="flex items-center gap-3">
        <IconButton label="Close challenge" variant="ghost" onClick={() => router.push('/dashboard')}><X /></IconButton>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
          <div className="h-full bg-mint transition-[width] duration-normal ease-brutal" style={{ width: `${done ? 100 : Math.round((index / total) * 100)}%` }} />
        </div>
        <span className="w-14 shrink-0 text-right font-heading text-sm font-bold tabular-nums">{done ? total : index + 1}/{total}</span>
      </div>
      <p className="mt-3 text-center font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Daily challenge · {done ? 'Complete' : 'Explore quiz'}
      </p>
      <div className="flex flex-1 flex-col justify-center py-6">
        {!done && card ? (
          <>
            <QuizCard
              question={card.question}
              selected={quiz.selected}
              onSelect={chooseAnswer}
              revealed={quiz.revealed}
              mode="challenge"
              canNext={quiz.revealed && !finishing && !answerError}
              onNext={next}
              canPrevious={index > 0 && !finishing && !answerError}
              onPrevious={() => setIndex((value) => Math.max(0, value - 1))}
            />
            {answerError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Your challenge answer couldn't be saved"
                description="Your previous progress is unchanged. Retry before moving on."
                onRetry={retryFailedAnswers}
              />
            ) : null}
            {finishError ? (
              <ErrorState
                className="mt-5 py-6"
                title="Your challenge couldn't be completed"
                description="Your answers are still here. Try finishing the challenge again."
                onRetry={next}
              />
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="grid size-20 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground shadow-brutal"><Trophy className="size-9" aria-hidden /></span>
            <div>
              <h1 className="font-heading text-3xl font-bold">Challenge complete</h1>
              <p className="mt-1 text-muted-foreground">You answered {correct} of {total} correctly.</p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <StatTile icon={Sparkles} value="+15" label="Bonus XP" accent="ink" />
              <StatTile icon={Trophy} value={correct} label="Correct" accent="mint" />
            </div>
            {xp > 0 ? <p className="text-xs text-muted-foreground">Quiz XP earned: +{xp}</p> : null}
          </div>
        )}
      </div>
      <div className="mt-auto">
        {!done ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-w-0 flex-1 px-3 text-sm"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0 || finishing || Boolean(answerError)}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <Button size="sm" className="min-w-0 flex-[1.35] px-3 text-sm" onClick={next} disabled={!quiz.revealed || finishing || answerError} loading={finishing}>
              {index < total - 1 ? 'Next question' : 'Finish challenge'}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        ) : <Button size="lg" className="w-full" onClick={() => router.push('/dashboard')}>Back to dashboard</Button>}
      </div>
    </div>
  )
}

function ChallengeSkeleton() {
  return <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-4"><Skeleton className="h-10 w-full" /><div className="flex flex-1 items-center"><Skeleton className="h-72 w-full" /></div><Skeleton className="h-12 w-full" /></div>
}
