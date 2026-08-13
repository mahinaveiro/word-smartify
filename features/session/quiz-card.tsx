'use client'

import { Check, X } from 'lucide-react'
import type { QuizQuestion } from '@/types/database'
import { cn } from '@/lib/utils'

export function QuizCard({
  question,
  selected,
  onSelect,
  revealed,
}: {
  question: QuizQuestion
  selected: string | null
  onSelect: (option: string) => void
  revealed: boolean
}) {
  const options = question.options ?? []

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-balance font-heading text-xl font-bold leading-snug">{question.question}</h2>

      <div className="flex flex-col gap-3" role="group" aria-label="Answer options">
        {options.map((option) => {
          const isCorrect = option === question.correct_answer
          const isSelected = option === selected
          const state = !revealed
            ? isSelected
              ? 'selected'
              : 'idle'
            : isCorrect
              ? 'correct'
              : isSelected
                ? 'wrong'
                : 'dim'

          return (
            <button
              key={option}
              type="button"
              disabled={revealed}
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={cn(
                'press flex items-center justify-between gap-3 rounded-md border-2 border-foreground px-4 py-3.5 text-left font-medium transition-colors',
                state === 'idle' && 'bg-card hover:bg-muted',
                state === 'selected' && 'bg-foreground text-primary-foreground shadow-brutal-sm',
                state === 'correct' && 'bg-mint text-mint-foreground shadow-brutal-sm',
                state === 'wrong' && 'bg-coral text-coral-foreground shadow-brutal-sm',
                state === 'dim' && 'bg-card opacity-55',
              )}
            >
              <span className="text-pretty">{option}</span>
              {revealed && isCorrect ? (
                <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden />
              ) : revealed && isSelected && !isCorrect ? (
                <X className="size-5 shrink-0" strokeWidth={3} aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>

      {revealed && question.explanation ? (
        <div className="rounded-md border-2 border-foreground bg-muted/60 p-4 text-sm leading-relaxed">
          {question.explanation}
        </div>
      ) : null}
    </div>
  )
}
