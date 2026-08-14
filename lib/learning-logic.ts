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
import { XP } from '@/lib/xp'

export { XP }

const DAY_MS = 24 * 60 * 60 * 1000

/** Spaced-repetition intervals (days) indexed by recall streak. */
const REVIEW_INTERVALS = [1, 2, 4, 7, 14, 30, 60]

export function statusRank(status: WordStatus): number {
  return { new: 0, learning: 1, strong: 2, mastered: 3 }[status]
}

export function statusLabel(status: WordStatus): string {
  return { new: 'New', learning: 'Learning', strong: 'Familiar', mastered: 'Mastered' }[status]
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
  let status: WordStatus = prevStatus === 'new' && !correct ? 'new' : 'learning'
  if (correct && recallStreak >= 5 && correctCount >= 5) status = 'mastered'
  else if (correct && recallStreak >= 2) status = 'strong'
  if (prevStatus === 'mastered') status = 'mastered'

  const becameLearned = prevStatus === 'new' && correct && status !== 'new'
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
