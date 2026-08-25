import { addDaysISO, shortDay } from './date'
import type { DailyProgress } from '../types/database'

export interface ProgressActivityDay {
  date: string
  label: string
  words: number
  xp: number
  cumulative: number
}

export function buildProgressActivity(
  dailyRows: DailyProgress[],
  today: string,
  windowDays: number,
): ProgressActivityDay[] {
  const byDate = new Map(dailyRows.map((row) => [row.date, row]))
  const activity: ProgressActivityDay[] = []
  let cumulative = 0

  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const date = addDaysISO(today, -index)
    const row = byDate.get(date)
    const words = row?.new_words_completed ?? 0
    cumulative += words
    activity.push({
      date,
      label: shortDay(date),
      words,
      xp: row?.xp_earned ?? 0,
      cumulative,
    })
  }

  return activity
}
