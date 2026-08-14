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
 *  - no changing the answer after submit (selected is frozen on lock)
 *  - no duplicate events for the same question, even if submit() is
 *    somehow called again before the next question loads
 *
 * It does NOT talk to repositories, XP, mastery, or stats — callers receive
 * the QuizAnswerEvent and decide what to do with it. This is what makes it
 * reusable across learning sessions, spaced review, and mock tests without
 * any of them re-implementing the lock/guard logic themselves.
 */
export function useQuizEngine(question: QuizQuestion | null) {
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<QuizPhase>('answering')
  const answeredQuestionId = useRef<string | null>(null)

  // Moving to a new (or cleared) question resets the machine exactly once.
  useEffect(() => {
    if (question?.id !== answeredQuestionId.current) {
      setSelected(null)
      setPhase('answering')
    }
  }, [question?.id])

  const submit = useCallback(
    (option: string): QuizAnswerEvent | null => {
      if (!question) return null
      if (phase === 'locked' || answeredQuestionId.current === question.id) return null

      const event = evaluateAnswer(question, option)
      setSelected(option)
      setPhase('locked')
      answeredQuestionId.current = question.id
      return event
    },
    [question, phase],
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
