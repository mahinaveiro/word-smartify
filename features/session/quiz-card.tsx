'use client'

import { Check, Lightbulb, X } from 'lucide-react'
import type { QuizQuestion } from '@/types/database'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import { CorrectAnswerCelebration } from './correct-answer-celebration'
import { useEffect, useState } from 'react'
import { useQuizKeyboardControls, vibrateForCorrectAnswer } from '@/hooks/use-quiz-keyboard-controls'

export function QuizCard({
  question,
  selected,
  onSelect,
  revealed,
  secure = false,
  canNext = false,
  onNext,
  canPrevious = false,
  onPrevious,
}: {
  question: QuizQuestion
  selected: string | null
  onSelect: (option: string) => void
  revealed: boolean
  secure?: boolean
  canNext?: boolean
  onNext?: () => void
  canPrevious?: boolean
  onPrevious?: () => void
}) {
  const [explanationForQuestion, setExplanationForQuestion] = useState<string | null>(null)
  const options = question.options ?? []
  const explanationOpen = revealed && explanationForQuestion === question.id
  const canRevealExplanation = revealed && Boolean(question.explanation)
  const answeredCorrectly = revealed && selected === question.correct_answer

  useQuizKeyboardControls({
    enabled: true,
    options,
    correctAnswer: question.correct_answer,
    canAnswer: !revealed,
    onAnswer: onSelect,
    canNext: canNext && Boolean(onNext),
    onNext: onNext ?? (() => undefined),
    canPrevious: canPrevious && Boolean(onPrevious),
    onPrevious: onPrevious ?? (() => undefined),
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'e' || !canRevealExplanation || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      event.preventDefault()
      setExplanationForQuestion(explanationOpen ? null : question.id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canRevealExplanation, explanationOpen, question.id])

  return (
    <div
      className={cn('relative flex flex-col gap-5', secure && 'select-none')}
      onCopy={secure ? (event) => event.preventDefault() : undefined}
      onCut={secure ? (event) => event.preventDefault() : undefined}
      onContextMenu={secure ? (event) => event.preventDefault() : undefined}
      onDragStart={secure ? (event) => event.preventDefault() : undefined}
    >
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
              onPointerDown={() => {
                if (option === question.correct_answer) vibrateForCorrectAnswer()
              }}
              onClick={(event) => {
                setExplanationForQuestion(null)
                // Pointer taps vibrate on pointer-down; detail 0 covers keyboard activation.
                if (event.detail === 0 && option === question.correct_answer) vibrateForCorrectAnswer()
                onSelect(option)
              }}
              aria-pressed={isSelected}
              className={cn(
                'press flex items-center justify-between gap-3 rounded-md border-2 border-foreground px-4 py-3.5 text-left font-medium transition-all duration-normal ease-brutal',
                state === 'idle' && 'bg-card hover:bg-muted',
                state === 'selected' && 'bg-foreground text-primary-foreground shadow-brutal-sm',
                state === 'correct' && 'bg-mint text-mint-foreground shadow-brutal-sm',
                state === 'wrong' && 'bg-coral text-coral-foreground shadow-brutal-sm',
                state === 'dim' && 'bg-card opacity-55',
              )}
            >
              <span className="flex min-w-0 items-center gap-3 text-pretty">
                <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-current/40 text-xs font-bold uppercase opacity-70">
                  {String.fromCharCode(97 + options.indexOf(option))}
                </span>
                <span>{option}</span>
              </span>
              {revealed && isCorrect ? (
                <Check className="size-5 shrink-0 animate-in zoom-in-75 duration-micro" strokeWidth={3} aria-hidden />
              ) : revealed && isSelected && !isCorrect ? (
                <X className="size-5 shrink-0 animate-in zoom-in-75 duration-micro" strokeWidth={3} aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex min-h-10 items-center justify-end">
        <IconButton
            label={explanationOpen ? 'Hide explanation' : canRevealExplanation ? 'Show explanation' : question.explanation ? 'Answer first to show explanation' : 'No explanation available'}
            variant={explanationOpen ? 'accent' : 'solid'}
            size="sm"
            disabled={!canRevealExplanation}
            aria-expanded={explanationOpen}
            aria-controls={`quiz-explanation-${question.id}`}
            onClick={() => setExplanationForQuestion(explanationOpen ? null : question.id)}
          >
            <Lightbulb className={cn(canRevealExplanation && !explanationOpen && 'animate-pulse')} aria-hidden />
          </IconButton>
        </div>

      {explanationOpen && question.explanation ? (
        <div
          id={`quiz-explanation-${question.id}`}
          role="status"
          className="absolute inset-x-0 top-full z-20 mt-2 rounded-md border-2 border-foreground bg-muted p-4 text-sm leading-relaxed shadow-brutal animate-in fade-in slide-in-from-top-2 duration-normal"
        >
          {question.explanation}
        </div>
      ) : null}

      {answeredCorrectly ? <CorrectAnswerCelebration /> : null}
    </div>
  )
}
