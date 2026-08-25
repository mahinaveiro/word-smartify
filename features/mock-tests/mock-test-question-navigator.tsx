'use client'

import { Check, SkipForward, Star } from 'lucide-react'
import type { QuizQuestion } from '@/types/database'
import { cn } from '@/lib/utils'

type MarkerMap = Record<string, boolean>

export function MockTestQuestionNavigator({
  questions,
  currentIndex,
  selectedAnswers,
  skippedQuestionIds,
  starredQuestionIds,
  onSelect,
}: {
  questions: QuizQuestion[]
  currentIndex: number
  selectedAnswers: Record<string, string | null>
  skippedQuestionIds: MarkerMap
  starredQuestionIds: MarkerMap
  onSelect: (index: number) => void
}) {
  const answeredCount = questions.filter((question) => selectedAnswers[question.id] != null).length

  return (
    <section
      aria-label="Mock test question navigator"
      className="mt-5 rounded-md border-2 border-foreground bg-muted/40 p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.14em]">Questions</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2 min-[420px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-10">
        {questions.map((question, questionIndex) => {
          const isCurrent = questionIndex === currentIndex
          const isAnswered = selectedAnswers[question.id] != null
          const isSkipped = Boolean(skippedQuestionIds[question.id])
          const isStarred = Boolean(starredQuestionIds[question.id])
          const status = [
            isAnswered ? 'answered' : null,
            isSkipped ? 'skipped' : null,
            isStarred ? 'starred' : null,
          ].filter(Boolean).join(', ')

          return (
            <button
              key={question.id}
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${questionIndex + 1}${status ? `, ${status}` : ', unanswered'}`}
              onClick={() => onSelect(questionIndex)}
              className={cn(
                'press relative grid aspect-square min-h-10 w-full place-items-center rounded-sm border-2 border-foreground px-1 text-xs font-bold tabular-nums transition-colors duration-normal ease-brutal',
                isCurrent && 'bg-foreground text-primary-foreground shadow-brutal-sm',
                !isCurrent && isSkipped && 'bg-coral text-coral-foreground',
                !isCurrent && !isSkipped && isStarred && 'bg-accent text-accent-foreground',
                !isCurrent && !isSkipped && !isStarred && isAnswered && 'bg-mint text-mint-foreground',
                !isCurrent && !isSkipped && !isStarred && !isAnswered && 'bg-card hover:bg-muted',
              )}
            >
              {questionIndex + 1}
              {isAnswered ? (
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-foreground bg-mint text-mint-foreground">
                  <Check className="size-2.5" strokeWidth={3} aria-hidden />
                </span>
              ) : null}
              {isSkipped || isStarred ? (
                <span className="absolute -right-1 -top-1 flex items-center gap-px rounded-full border border-foreground bg-background px-0.5 py-px">
                  {isSkipped ? <SkipForward className="size-2.5 text-coral-foreground" strokeWidth={3} aria-hidden /> : null}
                  {isStarred ? <Star className="size-2.5 fill-accent text-accent-foreground" strokeWidth={3} aria-hidden /> : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

