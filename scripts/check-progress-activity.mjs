const addDaysISO = (iso, days) => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const shortDay = (iso) => new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)).slice(0, 2)

const buildProgressActivity = (dailyRows, today, windowDays) => {
  const byDate = new Map(dailyRows.map((row) => [row.date, row]))
  const activity = []
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

const rows = [
  { date: '2026-08-18', new_words_completed: 25, xp_earned: 0 },
  { date: '2026-08-19', new_words_completed: 37, xp_earned: 0 },
  { date: '2026-08-20', new_words_completed: 23, xp_earned: 0 },
  { date: '2026-08-22', new_words_completed: 20, xp_earned: 0 },
  { date: '2026-08-23', new_words_completed: 30, xp_earned: 0 },
  { date: '2026-08-24', new_words_completed: 30, xp_earned: 0 },
]

const activity = buildProgressActivity(rows, '2026-08-24', 14)
const byDate = new Map(activity.map((day) => [day.date, day]))
const expected = [
  ['2026-08-18', 25, 25],
  ['2026-08-19', 37, 62],
  ['2026-08-20', 23, 85],
  ['2026-08-22', 20, 105],
  ['2026-08-23', 30, 135],
  ['2026-08-24', 30, 165],
]

for (const [date, words, cumulative] of expected) {
  const day = byDate.get(date)
  if (!day || day.words !== words || day.cumulative !== cumulative) {
    throw new Error(`Progress activity mismatch for ${date}: ${JSON.stringify(day)}`)
  }
}

if (byDate.get('2026-08-21')?.words !== 0 || byDate.get('2026-08-21')?.cumulative !== 85) {
  throw new Error(`Gap-day cumulative carry-forward mismatch: ${JSON.stringify(byDate.get('2026-08-21'))}`)
}

if (activity.length !== 14) throw new Error(`Expected 14 days, received ${activity.length}`)
console.log('Progress activity regression passed: six active days and the zero-gap carry-forward map to real cumulative totals.')
