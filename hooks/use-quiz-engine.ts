'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuizQuestion } from '@/types/database'
import { evaluateAnswer, type QuizAnswerEvent, type QuizPhase } from '@/lib/quiz-engine'

/**
 * Reusable question-answering state machine.
 *
 * Owns exactly one concern: turning a tap into a single, guarded
 * QuizAnswerEvent per question. It enforces:
 *  - no double submission (submit() is a no-op once locked)
 *  - no changing the answer after submit in the default locked mode
 *  - no duplicate events for the same question in locked mode
 *  - editable mode emits a fresh event when the answer changes
 *
 * It does NOT talk to repositories, XP, mastery, or stats — callers receive
 * the QuizAnswerEvent and decide what to do with it. This is what makes it
 * reusable across learning sessions, spaced review, and mock tests without
 * any of them re-implementing the lock/guard logic themselves.
 */
export function useQuizEngine(
  question: QuizQuestion | null,
  options: { allowChange?: boolean; initialSelected?: string | null; initialRevealed?: boolean } = {},
) {
  const allowChange = options.allowChange ?? false
  const initialSelected = options.initialSelected ?? null
  const initialRevealed = options.initialRevealed ?? false
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<QuizPhase>('answering')
  const answeredQuestionId = useRef<string | null>(null)
  const activeQuestionId = useRef<string | null>(null)

  // A new question id (including null when the session clears) fully resets the machine.
  useEffect(() => {
    const id = question?.id ?? null
    if (id === activeQuestionId.current) return
    activeQuestionId.current = id
    setSelected(initialSelected)
    const shouldLock = initialRevealed && !allowChange && initialSelected !== null
    setPhase(shouldLock ? 'locked' : 'answering')
    answeredQuestionId.current = shouldLock ? id : null
  }, [allowChange, initialRevealed, initialSelected, question?.id])

  const submit = useCallback(
    (option: string): QuizAnswerEvent | null => {
      if (!question) return null
      if (phase === 'locked' || answeredQuestionId.current === question.id) return null

      const event = evaluateAnswer(question, option)
      setSelected(option)
      if (!allowChange) setPhase('locked')
      if (!allowChange) answeredQuestionId.current = question.id
      return event
    },
    [allowChange, phase, question],
  )

  const reset = useCallback(() => {
    setSelected(null)
    setPhase('answering')
    answeredQuestionId.current = null
  }, [])

  return {
    selected,
    revealed: phase === 'locked',
    submit,
    reset,
  }
}
