/**
 * XP economy — the single source of truth for every award.
 *
 * Each function describes an idempotent transition, rather than a cap on
 * totals. Repeating an already-credited transition therefore earns zero XP
 * without hiding legitimate progress behind an arbitrary daily limit.
 */

import type { UserWordProgress, WordStatus } from '@/types/database'

export const XP = {
  NEW_WORD: 5,
  CORRECT_QUIZ: 3,
  REVIEW_COMPLETED: 2,
  DAILY_GOAL: 25,
  DAILY_CHALLENGE: 15,
} as const

export function xpForNewWord(
  previous: UserWordProgress | null,
  nextStatus: WordStatus,
): number {
  return (previous == null || previous.status === 'new') && nextStatus !== 'new' ? XP.NEW_WORD : 0
}

export function xpForCorrectQuiz(
  previous: UserWordProgress | null,
  alreadyCreditedToday: boolean,
  correct: boolean,
): number {
  return correct && !alreadyCreditedToday && previous?.status !== 'mastered' ? XP.CORRECT_QUIZ : 0
}

export type QuizMode = 'learning' | 'review' | 'challenge'

export function xpForReview(
  previous: UserWordProgress | null,
  alreadyCreditedToday: boolean,
  mode: QuizMode,
): number {
  return mode === 'review' && previous?.status !== 'mastered' && !alreadyCreditedToday
    ? XP.REVIEW_COMPLETED
    : 0
}

export function xpForQuizAnswer(input: {
  previous: UserWordProgress | null
  nextStatus: WordStatus
  alreadyCreditedToday: boolean
  mode: QuizMode
  correct: boolean
}): number {
  return (
    xpForNewWord(input.previous, input.nextStatus) +
    xpForCorrectQuiz(input.previous, input.alreadyCreditedToday, input.correct) +
    xpForReview(input.previous, input.alreadyCreditedToday, input.mode)
  )
}

export function xpForDailyGoal(
  wasCompleted: boolean,
  isCompleted: boolean,
): number {
  return !wasCompleted && isCompleted ? XP.DAILY_GOAL : 0
}

export function xpForDailyChallenge(alreadyCompleted: boolean): number {
  return alreadyCompleted ? 0 : XP.DAILY_CHALLENGE
}

/** Compatibility aliases for callers that previously imported learning logic. */
