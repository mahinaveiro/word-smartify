import type { DailyProgress, ISODate } from '@/types/database'
import { addDaysISO } from '@/lib/date'

export interface StreakResult {
  current: number
  longest: number
}

/**
 * Counts only completed assigned goals. Today may be unfinished while the
 * current run remains alive through yesterday; a missed required day resets it.
 */
export function computeStreak(
  rows: Pick<DailyProgress, 'date' | 'completed'>[],
  today: ISODate,
): StreakResult {
  const completed = new Set(rows.filter((row) => row.completed).map((row) => row.date))
  const todayDone = completed.has(today)
  let current = 0
  let cursor = todayDone ? today : addDaysISO(today, -1)
  while (completed.has(cursor)) {
    current++
    cursor = addDaysISO(cursor, -1)
  }

  let longest = 0
  let run = 0
  const dates = [...completed].sort()
  for (let index = 0; index < dates.length; index++) {
    const date = dates[index]
    const previous = dates[index - 1]
    if (run === 0 || date === addDaysISO(previous ?? date, 1)) {
      run++
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
  }
  return { current, longest }
}
