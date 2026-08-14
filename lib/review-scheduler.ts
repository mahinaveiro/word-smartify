/**
 * Review scheduler — pure spaced-repetition selection logic.
 *
 * Given a user's word progress rows, answers the three questions used across
 * the app (dashboard, review sessions, future daily-plan surfaces):
 *   - which words are due for review right now?
 *   - which words are "weak" (shaky recall, worth extra practice)?
 *   - what should today's review queue actually contain?
 *
 * This module only reads UserWordProgress rows — it never touches
 * repositories, XP, or UI. The local implementation and the future
 * Supabase implementation can both feed it the same rows and get the same
 * answers, so this logic never has to be rewritten.
 */

import type { UserWordProgress } from '@/types/database'

export const DEFAULT_REVIEW_QUEUE_LIMIT = 20

/** Due = scheduled for review and not yet mastered. */
export function isDue(progress: UserWordProgress, nowIso = new Date().toISOString()): boolean {
  return (
    progress.status !== 'mastered' &&
    progress.next_review_at != null &&
    progress.next_review_at <= nowIso
  )
}

/**
 * Weak = recall isn't sticking. A word counts as weak once it's been
 * answered at least twice and either has no active recall streak, or has
 * been missed as often as (or more than) it's been gotten right. Mastered
 * words are never weak — mastery already proved the recall.
 */
export function isWeak(progress: UserWordProgress): boolean {
  const seen = progress.correct_count + progress.wrong_count
  if (seen < 2 || progress.status === 'mastered') return false
  return progress.recall_streak === 0 || progress.wrong_count >= progress.correct_count
}

export function getDueWords(
  allProgress: UserWordProgress[],
  nowIso = new Date().toISOString(),
): UserWordProgress[] {
  return allProgress.filter((p) => isDue(p, nowIso))
}

export function getWeakWords(allProgress: UserWordProgress[]): UserWordProgress[] {
  return allProgress.filter((p) => isWeak(p))
}

/**
 * Builds today's review queue: overdue words first (most overdue first),
 * then weak words not already included, capped at `limit`.
 */
export function buildReviewQueue(
  allProgress: UserWordProgress[],
  opts: { limit?: number; nowIso?: string } = {},
): UserWordProgress[] {
  const limit = opts.limit ?? DEFAULT_REVIEW_QUEUE_LIMIT
  const nowIso = opts.nowIso ?? new Date().toISOString()

  const due = getDueWords(allProgress, nowIso).sort((a, b) =>
    (a.next_review_at ?? '').localeCompare(b.next_review_at ?? ''),
  )
  const dueIds = new Set(due.map((p) => p.word_id))
  const weak = getWeakWords(allProgress).filter((p) => !dueIds.has(p.word_id))

  return [...due, ...weak].slice(0, limit)
}
