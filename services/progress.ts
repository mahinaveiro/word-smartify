import { addDaysISO, todayISO } from '@/lib/date'
import { xpToLevel } from '@/lib/learning-logic'
import { buildProgressActivity } from '@/lib/progress-activity'
import { repositories } from '@/repositories'
import type { BookProgressSummary, UserStats } from '@/types/database'

export interface ProgressSummary {
  stats: UserStats
  accuracy: {
    correct: number
    wrong: number
    percent: number
  }
  bookProgress: BookProgressSummary[]
  level: ReturnType<typeof xpToLevel>
  weeklyActivity: Array<{
    date: string
    label: string
    words: number
    xp: number
    cumulative: number
  }>
  reviewConsistency: {
    completedDays: number
    windowDays: number
    percent: number
    totalReviews: number
  }
}

export async function buildProgressSummary(
  userId: string,
  today = todayISO(),
  windowDays = 14,
): Promise<ProgressSummary> {
  const [stats, progress, dailyRows, bookProgress] = await Promise.all([
    repositories.stats.getStats(userId),
    repositories.wordProgress.getAllProgress(userId),
    repositories.dailyProgress.getRange(userId, addDaysISO(today, -(windowDays - 1)), today),
    repositories.wordProgress.getBookProgress(userId),
  ])

  const correct = progress.reduce((sum, row) => sum + row.correct_count, 0)
  const wrong = progress.reduce((sum, row) => sum + row.wrong_count, 0)
  const attempts = correct + wrong
  const weeklyActivity = buildProgressActivity(dailyRows, today, windowDays)
  const completedReviewDays = dailyRows.filter((row) => row.reviews_completed > 0).length
  const totalReviews = dailyRows.reduce((sum, row) => sum + row.reviews_completed, 0)

  return {
    stats,
    accuracy: {
      correct,
      wrong,
      percent: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    },
    bookProgress,
    level: xpToLevel(stats.total_xp),
    weeklyActivity,
    reviewConsistency: {
      completedDays: completedReviewDays,
      windowDays,
      percent: Math.round((completedReviewDays / windowDays) * 100),
      totalReviews,
    },
  }
}
