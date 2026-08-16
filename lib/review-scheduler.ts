/**
 * Review scheduler — pure spaced-repetition selection logic.
 *
 * The scheduler deliberately derives richer learning signals from the existing
 * user_word_progress columns. No new persistence or schema is needed: due time,
 * answer history, and recall streak are enough to make review selection useful.
 */

import type { UserWordProgress } from '@/types/database'

export const DEFAULT_REVIEW_QUEUE_LIMIT = 20
export const WEAK_DRILL_LIMIT = 10
export const DAILY_CHALLENGE_LIMIT = 5

export type MemoryState = 'new' | 'learning' | 'needs_review' | 'stable' | 'mastered'

/** Due = scheduled for review and not yet mastered. */
export function isDue(progress: UserWordProgress, nowIso = new Date().toISOString()): boolean {
  return (
    progress.status !== 'mastered' &&
    progress.next_review_at != null &&
    progress.next_review_at <= nowIso
  )
}

/**
 * Weak = recall is not reliable yet. A word needs enough history to avoid
 * turning a single unlucky answer into a permanent drill recommendation.
 */
export function isWeak(progress: UserWordProgress): boolean {
  const attempts = progress.correct_count + progress.wrong_count
  if (attempts < 2 || progress.status === 'mastered') return false

  const accuracy = progress.correct_count / attempts
  return (
    progress.recall_streak <= 1 ||
    progress.wrong_count >= progress.correct_count ||
    accuracy < 0.7
  )
}

/**
 * A plain-language memory state for UI copy and future diagnostics. This is
 * derived, not persisted, so it cannot drift from the existing progress model.
 */
export function getMemoryState(
  progress: UserWordProgress | null,
  nowIso = new Date().toISOString(),
): MemoryState {
  if (!progress || progress.status === 'new' && progress.correct_count + progress.wrong_count === 0) {
    return 'new'
  }
  if (progress.status === 'mastered') return 'mastered'
  if (isDue(progress, nowIso) || isWeak(progress)) return 'needs_review'
  if (progress.status === 'strong') return 'stable'
  return 'learning'
}

export function getDueWords(
  allProgress: UserWordProgress[],
  nowIso = new Date().toISOString(),
): UserWordProgress[] {
  return allProgress.filter((progress) => isDue(progress, nowIso))
}

export function getWeakWords(allProgress: UserWordProgress[]): UserWordProgress[] {
  return allProgress.filter((progress) => isWeak(progress))
}

function weaknessScore(progress: UserWordProgress): number {
  const attempts = progress.correct_count + progress.wrong_count
  if (attempts === 0) return 0
  const errorRate = progress.wrong_count / attempts
  const streakRisk = Math.max(0, 3 - progress.recall_streak) / 3
  return errorRate * 70 + streakRisk * 30
}

function overdueHours(progress: UserWordProgress, nowIso: string): number {
  if (!progress.next_review_at) return 0
  const elapsed = Date.parse(nowIso) - Date.parse(progress.next_review_at)
  return Math.max(0, elapsed) / (60 * 60 * 1000)
}

function compareDue(a: UserWordProgress, b: UserWordProgress, nowIso: string): number {
  const priorityDifference = (
    weaknessScore(b) * 1.5 + overdueHours(b, nowIso) * 0.35
  ) - (
    weaknessScore(a) * 1.5 + overdueHours(a, nowIso) * 0.35
  )
  if (priorityDifference !== 0) return priorityDifference
  return (a.next_review_at ?? '').localeCompare(b.next_review_at ?? '')
}

function compareWeak(a: UserWordProgress, b: UserWordProgress): number {
  const scoreDifference = weaknessScore(b) - weaknessScore(a)
  if (scoreDifference !== 0) return scoreDifference

  const attemptsDifference = (
    b.correct_count + b.wrong_count
  ) - (
    a.correct_count + a.wrong_count
  )
  if (attemptsDifference !== 0) return attemptsDifference
  return (a.updated_at ?? '').localeCompare(b.updated_at ?? '')
}

/**
 * Builds the general review queue: due words first, ranked by error risk and
 * how overdue they are, then weak words that are not already in the queue.
 */
export function buildReviewQueue(
  allProgress: UserWordProgress[],
  opts: { limit?: number; nowIso?: string } = {},
): UserWordProgress[] {
  const limit = opts.limit ?? DEFAULT_REVIEW_QUEUE_LIMIT
  const nowIso = opts.nowIso ?? new Date().toISOString()

  const due = getDueWords(allProgress, nowIso).sort((a, b) => compareDue(a, b, nowIso))
  const dueIds = new Set(due.map((progress) => progress.word_id))
  const weak = getWeakWords(allProgress)
    .filter((progress) => !dueIds.has(progress.word_id))
    .sort(compareWeak)

  return [...due, ...weak].slice(0, limit)
}

/**
 * A focused recovery queue for words that repeatedly fail or have an unstable
 * recall streak. It intentionally excludes merely overdue-but-healthy words.
 */
export function buildWeakWordQueue(
  allProgress: UserWordProgress[],
  limit = WEAK_DRILL_LIMIT,
): UserWordProgress[] {
  return getWeakWords(allProgress).sort(compareWeak).slice(0, limit)
}

/**
 * Challenge practice favors weak learned words, then fills with other learned
 * words. Keeping this selection beside review scheduling makes both surfaces
 * use the same weakness signals.
 */
export function buildChallengeQueue(
  allProgress: UserWordProgress[],
  limit = DAILY_CHALLENGE_LIMIT,
): UserWordProgress[] {
  const learned = allProgress.filter((progress) => progress.status !== 'new')
  const weak = learned.filter(isLegacyChallengeWeak)
  const weakIds = new Set(weak.map((progress) => progress.word_id))
  const rest = learned.filter((progress) => !weakIds.has(progress.word_id))
  return [...weak, ...rest].slice(0, limit)
}

/** Keep the established challenge definition stable; review can evolve separately. */
function isLegacyChallengeWeak(progress: UserWordProgress): boolean {
  const seen = progress.correct_count + progress.wrong_count
  if (seen < 2 || progress.status === 'mastered') return false
  return progress.recall_streak === 0 || progress.wrong_count >= progress.correct_count
}
