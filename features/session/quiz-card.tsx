'use client'

import { Check, Lightbulb, X } from 'lucide-react'
import type { QuizQuestion } from '@/types/database'
import type { QuestionReportMode } from '@/types/question-reports'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import { CorrectAnswerCelebration } from './correct-answer-celebration'
import { useEffect, useRef, useState } from 'react'
import { useQuizKeyboardControls, vibrateForCorrectAnswer } from '@/hooks/use-quiz-keyboard-controls'
import { QuestionReportDialog } from './question-report-dialog'

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
  mode = 'learning',
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
  mode?: QuestionReportMode
}) {
  const [explanationForQuestion, setExplanationForQuestion] = useState<string | null>(null)
  const [celebrationQuestionId, setCelebrationQuestionId] = useState<string | null>(null)
  const celebratedQuestionIds = useRef<Set<string>>(new Set())
  const options = question.options ?? []
  const explanationOpen = revealed && explanationForQuestion === question.id
  const canRevealExplanation = !secure && revealed && Boolean(question.explanation)
  const answeredCorrectly = revealed && selected === question.correct_answer
  const shouldCelebrateCorrectAnswer = answeredCorrectly && celebrationQuestionId === question.id

  const handleSelect = (option: string) => {
    if (!revealed && option === question.correct_answer && !celebratedQuestionIds.current.has(question.id)) {
      celebratedQuestionIds.current.add(question.id)
      setCelebrationQuestionId(question.id)
    }
    onSelect(option)
  }

  useQuizKeyboardControls({
    enabled: true,
    options,
    correctAnswer: question.correct_answer,
    canAnswer: !revealed,
    onAnswer: handleSelect,
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
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-balance font-heading text-xl font-bold leading-snug">{question.question}</h2>
        <div className="shrink-0">
          <QuestionReportDialog question={question} mode={mode} />
        </div>
      </div>

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
              onTouchStart={() => {
                if (option === question.correct_answer) vibrateForCorrectAnswer()
              }}
              onPointerDown={(event) => {
                // Touch browsers use touchstart above; this covers mouse and pen input without double-pulsing.
                if (event.pointerType !== 'touch' && option === question.correct_answer) vibrateForCorrectAnswer()
              }}
              onClick={(event) => {
                setExplanationForQuestion(null)
                // Keyboard activation has no touchstart/pointerdown event, so keep its direct haptic path.
                if (event.detail === 0 && option === question.correct_answer) vibrateForCorrectAnswer()
                handleSelect(option)
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

      <div className="relative flex min-h-10 items-center justify-end gap-1">
        {!secure ? (
          <div className="relative flex items-center justify-end">
            {explanationOpen && question.explanation ? (
            <button
              type="button"
              aria-label="Close explanation"
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setExplanationForQuestion(null)}
            />
          ) : null}
            <div className="relative z-50">
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
              {explanationOpen && question.explanation ? (
              <div
                id={`quiz-explanation-${question.id}`}
                role="dialog"
                aria-modal="true"
                className="absolute bottom-[calc(100%+0.75rem)] right-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border-2 border-foreground bg-muted p-4 text-left text-sm leading-relaxed shadow-brutal quiz-explanation-pop sm:p-5"
              >
                <span
                  aria-hidden
                  className="absolute -bottom-2 right-3 size-4 rotate-45 border-b-2 border-r-2 border-foreground bg-muted"
                />
                {question.explanation}
              </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {shouldCelebrateCorrectAnswer ? <CorrectAnswerCelebration /> : null}
    </div>
  )
}
