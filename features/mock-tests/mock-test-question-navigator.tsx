'use client'

import { SkipForward, Star } from 'lucide-react'
import type { QuizQuestion } from '@/types/database'
import { cn } from '@/lib/utils'

type MarkerMap = Record<string, boolean>

export function MockTestQuestionNavigator({
  questions,
  currentIndex,
  skippedQuestionIds,
  starredQuestionIds,
  onSelect,
}: {
  questions: QuizQuestion[]
  currentIndex: number
  skippedQuestionIds: MarkerMap
  starredQuestionIds: MarkerMap
  onSelect: (index: number) => void
}) {
  const markedQuestions = questions
    .map((question, questionIndex) => ({ question, questionIndex }))
    .filter(({ question }) => skippedQuestionIds[question.id] || starredQuestionIds[question.id])

  if (markedQuestions.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Marked mock-test questions">
      <span className="sr-only">Marked questions</span>
      {markedQuestions.map(({ question, questionIndex }) => {
        const isCurrent = questionIndex === currentIndex
        const isSkipped = Boolean(skippedQuestionIds[question.id])
        const isStarred = Boolean(starredQuestionIds[question.id])
        const status = [isSkipped ? 'skipped' : null, isStarred ? 'starred' : null].filter(Boolean).join(' and ')

        return (
          <button
            key={question.id}
            type="button"
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Question ${questionIndex + 1}, ${status}`}
            onClick={() => onSelect(questionIndex)}
            className={cn(
              'press relative grid size-9 place-items-center rounded-sm border-2 border-foreground bg-card text-xs font-bold tabular-nums transition-colors duration-normal ease-brutal',
              isCurrent && 'bg-foreground text-primary-foreground shadow-brutal-sm',
              !isCurrent && isSkipped && 'bg-coral text-coral-foreground',
              !isCurrent && !isSkipped && isStarred && 'bg-accent text-accent-foreground',
            )}
          >
            {questionIndex + 1}
            <span className="absolute -right-1 -top-1 flex items-center gap-px rounded-full border border-foreground bg-background px-0.5 py-px">
              {isSkipped ? <SkipForward className="size-2.5 text-foreground" strokeWidth={3} aria-hidden /> : null}
              {isStarred ? <Star className="size-2.5 fill-accent text-foreground" strokeWidth={3} aria-hidden /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

