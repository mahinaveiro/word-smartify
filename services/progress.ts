import { addDaysISO, todayISO, shortDay } from '@/lib/date'
import { xpToLevel } from '@/lib/learning-logic'
import { repositories, getActiveUserId } from '@/repositories'
import type { BookProgressSummary, DailyProgress, UserStats } from '@/types/database'

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
  userId = getActiveUserId(),
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
  const byDate = new Map(dailyRows.map((row) => [row.date, row]))
  const weeklyActivity: ProgressSummary['weeklyActivity'] = []
  let cumulative = 0
  let completedReviewDays = 0
  let totalReviews = 0

  for (let index = windowDays - 1; index >= 0; index--) {
    const date = addDaysISO(today, -index)
    const row: DailyProgress | undefined = byDate.get(date)
    const words = row?.new_words_completed ?? 0
    cumulative += words
    const reviews = row?.reviews_completed ?? 0
    if (reviews > 0) completedReviewDays += 1
    totalReviews += reviews
    weeklyActivity.push({
      date,
      label: shortDay(date),
      words,
      xp: row?.xp_earned ?? 0,
      cumulative,
    })
  }

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
