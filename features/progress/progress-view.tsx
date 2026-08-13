'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Flame, Trophy, Zap, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/features/shared/stat-tile'
import { statusLabel } from '@/lib/learning-logic'
import { addDaysISO, shortDay, todayISO } from '@/lib/date'
import { useStats, useProgressCounts, useDailyRange } from '@/hooks/use-data'
import type { WordStatus } from '@/types/database'

const STATUS_ORDER: WordStatus[] = ['mastered', 'familiar', 'learning', 'new']
const STATUS_COLOR: Record<WordStatus, string> = {
  mastered: 'var(--mint)',
  familiar: 'var(--coral)',
  learning: 'var(--muted-foreground)',
  new: 'var(--border)',
}

export function ProgressView() {
  const { data: stats } = useStats()
  const { data: counts } = useProgressCounts()
  const today = todayISO()
  const from = addDaysISO(today, -13)
  const { data: range } = useDailyRange(from, today)

  const weekly = useMemo(() => {
    // Build a continuous 14-day series (fill gaps with 0).
    const byDate = new Map((range ?? []).map((d) => [d.date, d]))
    const days: { date: string; label: string; words: number; xp: number; cumulative: number }[] = []
    let cumulative = 0
    for (let i = 13; i >= 0; i--) {
      const date = addDaysISO(today, -i)
      const row = byDate.get(date)
      const words = row?.new_words_completed ?? 0
      cumulative += words
      days.push({ date, label: shortDay(date), words, xp: row?.xp_earned ?? 0, cumulative })
    }
    return days
  }, [range, today])

  if (!stats || !counts) return <ProgressSkeleton />

  const totalTracked = STATUS_ORDER.reduce((s, k) => s + counts[k], 0)
  const last7Words = weekly.slice(-7).reduce((s, d) => s + d.words, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Insights" title="Progress" description="Track your streak, mastery, and daily momentum." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Flame} value={stats.current_streak} label="Current streak" accent="coral" />
        <StatTile icon={Zap} value={stats.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={BookOpen} value={stats.words_learned.toLocaleString()} label="Learned" />
        <StatTile icon={Trophy} value={stats.words_mastered.toLocaleString()} label="Mastered" accent="mint" />
      </div>

      {/* Weekly activity */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-heading text-base font-bold">Daily activity</h2>
            <span className="text-xs font-medium text-muted-foreground">{last7Words} words this week</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">New words completed over the last 14 days.</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={1} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTip unit="words" />} />
                <Bar dataKey="words" fill="var(--mint)" stroke="var(--foreground)" strokeWidth={2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative words */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-heading text-base font-bold">Words learned (cumulative)</h2>
          <p className="mb-4 text-sm text-muted-foreground">Momentum across the last 14 days.</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={1} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                <Tooltip cursor={{ stroke: 'var(--muted-foreground)' }} content={<ChartTip unit="words total" dataKey="cumulative" />} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--coral)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--coral)', stroke: 'var(--foreground)', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: 'var(--foreground)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Mastery breakdown */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-heading text-base font-bold">Mastery breakdown</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {totalTracked.toLocaleString()} words in progress across all levels.
          </p>
          <div className="flex flex-col gap-3">
            {STATUS_ORDER.map((status) => {
              const value = counts[status]
              const pct = totalTracked > 0 ? Math.round((value / totalTracked) * 100) : 0
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="inline-block size-3 rounded-sm border-2 border-foreground"
                        style={{ backgroundColor: STATUS_COLOR[status] }}
                        aria-hidden
                      />
                      {statusLabel(status)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {value.toLocaleString()} · {pct}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[status] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChartTip({
  active,
  payload,
  label,
  unit,
  dataKey = 'words',
}: {
  active?: boolean
  payload?: Array<{ payload: Record<string, number | string> }>
  label?: string
  unit: string
  dataKey?: string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].payload[dataKey]
  return (
    <div className="rounded-md border-2 border-foreground bg-card px-3 py-2 text-xs shadow-brutal-sm">
      <p className="font-heading font-bold">{label}</p>
      <p className="text-muted-foreground">
        {value} {unit}
      </p>
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
