'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatTile } from '@/features/shared/stat-tile'
import { QuizCard } from '@/features/session/quiz-card'
import { useToast } from '@/components/ui/toast'
import { useChallengeSession } from './use-challenge-session'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import { useActions, type QuizAnswerResult } from '@/hooks/use-actions'
import { useDailyProgress } from '@/hooks/use-data'
import { todayISO } from '@/lib/date'

type Phase = 'quiz' | 'summary'

export function ChallengeView() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: cards, isLoading, error, mutate } = useChallengeSession()
  const { data: daily } = useDailyProgress(todayISO())
  const { recordQuizAnswer, completeDailyChallenge, revalidateUser } = useActions()
  const [phase, setPhase] = useState<Phase>(daily?.challenge_completed ? 'summary' : 'quiz')
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [results, setResults] = useState<QuizAnswerResult[]>([])
  const answeredIds = useRef<string[]>([])

  useEffect(() => {
    if (daily?.challenge_completed) setPhase('summary')
  }, [daily?.challenge_completed])

  const total = cards?.length ?? 0
  const card = cards?.[index]
  const quiz = useQuizEngine(phase === 'quiz' ? card?.question ?? null : null)

  if (isLoading) return <ChallengeSkeleton />
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
          description="Answer a few learning or review words, then come back for a short weak-word quiz."
          action={<Button onClick={() => router.push('/dashboard')}>Back to dashboard</Button>}
        />
      </div>
    )
  }

  async function chooseAnswer(option: string) {
    if (!card) return
    const event = quiz.submit(option)
    if (!event) return
    setBusy(true)
    try {
      const result = await recordQuizAnswer(card.word.id, event.isCorrect, 'challenge')
      answeredIds.current = [...answeredIds.current, card.word.id]
      setResults((previous) => [...previous, result])
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (index < total - 1) {
      setIndex((current) => current + 1)
      return
    }
    if (finishing) return
    setFinishing(true)
    try {
      await completeDailyChallenge([...new Set(answeredIds.current)])
      revalidateUser()
      toast({ title: 'Challenge complete!', description: '+15 XP earned.', tone: 'success' })
      setPhase('summary')
    } catch {
      toast({ title: 'Finish every question first', description: 'Answer all challenge words before collecting the reward.', tone: 'default' })
    } finally {
      setFinishing(false)
    }
  }

  const correct = results.filter((result) => result.correct).length
  const xp = results.reduce((sum, result) => sum + result.xpEarned, 0)
  const done = phase === 'summary' || daily?.challenge_completed

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <IconButton label="Close challenge" variant="ghost" onClick={() => router.push('/dashboard')}><X /></IconButton>
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-foreground bg-card">
          <div className="h-full bg-mint transition-[width]" style={{ width: `${done ? 100 : Math.round((index / total) * 100)}%` }} />
        </div>
        <span className="w-14 shrink-0 text-right font-heading text-sm font-bold tabular-nums">{done ? total : index + 1}/{total}</span>
      </div>
      <p className="mt-3 text-center font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Daily challenge · {done ? 'Complete' : 'Weak-word quiz'}
      </p>
      <div className="flex flex-1 flex-col justify-center py-6">
        {!done && card ? (
          <QuizCard question={card.question} selected={quiz.selected} onSelect={chooseAnswer} revealed={quiz.revealed} />
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
          <Button size="lg" className="w-full" onClick={next} disabled={!quiz.revealed || busy || finishing} loading={busy || finishing}>
            {index < total - 1 ? 'Next word' : 'Finish challenge'} <ArrowRight className="size-5" aria-hidden />
          </Button>
        ) : <Button size="lg" className="w-full" onClick={() => router.push('/dashboard')}>Back to dashboard</Button>}
      </div>
    </div>
  )
}

function ChallengeSkeleton() {
  return <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-4"><Skeleton className="h-10 w-full" /><div className="flex flex-1 items-center"><Skeleton className="h-72 w-full" /></div><Skeleton className="h-12 w-full" /></div>
}
