export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Add (or subtract) days to an ISO 'YYYY-MM-DD' date. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Single-letter/short weekday for compact chart axes. */
export function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

export function shortDate(iso: string): string {
  // iso: 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}


export interface WeekPeriod {
  start: string
  end: string
}

/** The product week runs from Saturday through Friday in UTC calendar dates. */
export function currentWeekPeriod(date = todayISO()): WeekPeriod {
  const [year, month, day] = date.split('-').map(Number)
  const current = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  const sundayBasedDay = current.getUTCDay()
  const daysSinceSaturday = (sundayBasedDay + 1) % 7
  const start = new Date(current)
  start.setUTCDate(start.getUTCDate() - daysSinceSaturday)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function formatWeekPeriod(period: WeekPeriod): string {
  return `${shortDate(period.start)} – ${shortDate(period.end)}`
}
