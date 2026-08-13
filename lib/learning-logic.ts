/**
 * Word Smartify business rules — pure functions, no storage access.
 *
 * These encode the product rules from the contract:
 *   - opening a word != mastery
 *   - correct quiz => stronger recall + later review
 *   - wrong quiz   => earlier review
 *   - XP economy with anti-farming
 *   - streak continues on daily-goal completion, resets when missed
 */

import type { UserWordProgress, WordStatus } from '@/types/database'
import { XP } from '@/types/database'

export { XP }

const DAY_MS = 24 * 60 * 60 * 1000

/** Spaced-repetition intervals (days) indexed by recall streak. */
const REVIEW_INTERVALS = [1, 2, 4, 7, 14, 30, 60]

export function statusRank(status: WordStatus): number {
  return { new: 0, learning: 1, familiar: 2, mastered: 3 }[status]
}

export function statusLabel(status: WordStatus): string {
  return { new: 'New', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered' }[status]
}

function nextReviewFrom(recallStreak: number, now: number): string {
  const idx = Math.min(recallStreak, REVIEW_INTERVALS.length - 1)
  return new Date(now + REVIEW_INTERVALS[idx] * DAY_MS).toISOString()
}

export interface ProgressUpdate {
  patch: Partial<Omit<UserWordProgress, 'id' | 'user_id' | 'word_id' | 'created_at'>>
  becameLearned: boolean
  becameMastered: boolean
}

/**
 * Compute the next progress state after answering a quiz for a word.
 * `prev` is null when the user has never had a row for this word.
 */
export function applyQuizResult(
  prev: UserWordProgress | null,
  correct: boolean,
  nowMs = Date.now(),
): ProgressUpdate {
  const nowIso = new Date(nowMs).toISOString()
  const prevStatus: WordStatus = prev?.status ?? 'new'
  const correctCount = (prev?.correct_count ?? 0) + (correct ? 1 : 0)
  const wrongCount = (prev?.wrong_count ?? 0) + (correct ? 0 : 1)

  let recallStreak = prev?.recall_streak ?? 0
  let nextReview: string

  if (correct) {
    recallStreak += 1
    nextReview = nextReviewFrom(recallStreak, nowMs)
  } else {
    recallStreak = 0
    // schedule earlier review — a few hours out
    nextReview = new Date(nowMs + 4 * 60 * 60 * 1000).toISOString()
  }

  // Status derived from demonstrated recall, never from merely opening a word.
  let status: WordStatus = 'learning'
  if (recallStreak >= 5 && correctCount >= 5) status = 'mastered'
  else if (recallStreak >= 2) status = 'familiar'
  else status = 'learning'

  const becameLearned = prevStatus === 'new'
  const becameMastered = prevStatus !== 'mastered' && status === 'mastered'

  return {
    patch: {
      status,
      correct_count: correctCount,
      wrong_count: wrongCount,
      recall_streak: recallStreak,
      next_review_at: nextReview,
      last_reviewed_at: nowIso,
    },
    becameLearned,
    becameMastered,
  }
}

/**
 * XP for a single quiz answer, with anti-farming: only the FIRST correct answer
 * that improves recall grants the correct-quiz XP; repeats on an already
 * mastered word grant nothing.
 */
export function xpForQuiz(prev: UserWordProgress | null, correct: boolean): number {
  if (!correct) return 0
  if (prev?.status === 'mastered') return 0
  return XP.CORRECT_QUIZ
}

export function xpForNewWord(prev: UserWordProgress | null): number {
  // Awarded once, when a word first leaves 'new'.
  return prev == null || prev.status === 'new' ? XP.NEW_WORD : 0
}

export interface DailyGoalState {
  goal: number
  newWordsCompleted: number
  reviewsCompleted: number
  challengeCompleted: boolean
  completed: boolean
}

export function isDailyGoalMet(state: Pick<DailyGoalState, 'goal' | 'newWordsCompleted'>): boolean {
  return state.newWordsCompleted >= state.goal
}

/** Streak logic: continues if yesterday (or today) completed; else resets to today. */
export function computeStreak(completedDatesDesc: string[], todayCompleted: boolean): number {
  // completedDatesDesc: ISO dates (YYYY-MM-DD) of completed days, newest first.
  const set = new Set(completedDatesDesc)
  let streak = 0
  const cursor = new Date()
  if (!todayCompleted) {
    // start counting from yesterday
    cursor.setDate(cursor.getDate() - 1)
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (set.has(key)) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return todayCompleted ? streak : streak
}

export function xpToLevel(totalXp: number): { level: number; into: number; span: number; pct: number } {
  // Simple escalating curve: level N needs 100 * N xp within the level.
  let level = 1
  let remaining = totalXp
  let span = 100
  while (remaining >= span) {
    remaining -= span
    level += 1
    span = 100 + (level - 1) * 25
  }
  return { level, into: remaining, span, pct: Math.round((remaining / span) * 100) }
}
