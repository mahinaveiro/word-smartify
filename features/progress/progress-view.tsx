'use client'

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
import { BookOpen, CheckCircle2, Flame, Target, Trophy, Zap } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { StatTile } from '@/features/shared/stat-tile'
import { statusLabel } from '@/lib/learning-logic'
import { useBooks, useProgressCounts, useProgressSummary } from '@/hooks/use-data'
import type { WordStatus } from '@/types/database'

const STATUS_ORDER: WordStatus[] = ['mastered', 'familiar', 'learning', 'new']
const STATUS_COLOR: Record<WordStatus, string> = {
  mastered: 'var(--mint)',
  familiar: 'var(--coral)',
  learning: 'var(--muted-foreground)',
  new: 'var(--border)',
}

export function ProgressView() {
  const summaryQuery = useProgressSummary()
  const countsQuery = useProgressCounts()
  const booksQuery = useBooks()
  const { data: summary } = summaryQuery
  const { data: counts } = countsQuery
  const { data: books } = booksQuery

  const queries = [summaryQuery, countsQuery, booksQuery]
  if (queries.some((query) => query.isLoading)) return <ProgressSkeleton />
  if (queries.some((query) => query.error)) {
    return (
      <ErrorState
        title="Progress data couldn't be loaded"
        description="Your learning history is safe. Try loading Progress again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }
  if (!summary || !counts) {
    return (
      <ErrorState
        title="Progress data is unavailable"
        description="We couldn't find the data needed for this page. Try again."
        onRetry={() => Promise.all(queries.map((query) => query.mutate()))}
      />
    )
  }

  const totalTracked = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0)
  const last7Words = summary.weeklyActivity.slice(-7).reduce((sum, day) => sum + day.words, 0)
  const level = summary.level

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Insights" title="Progress" description="Track your streak, mastery, and daily momentum." />
      {totalTracked === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You haven't started learning yet."
          description="Open Learn to study your first level and your progress will appear here."
          action={<a href="/learn" className="font-heading text-sm font-bold underline underline-offset-4">Go to Learn</a>}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Zap} value={summary.stats.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={Flame} value={summary.stats.current_streak} label="Current streak" accent="coral" />
        <StatTile icon={Trophy} value={summary.stats.longest_streak} label="Longest streak" accent="mint" />
        <StatTile icon={BookOpen} value={summary.stats.words_learned.toLocaleString()} label="Words learned" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Words mastered" value={summary.stats.words_mastered.toLocaleString()} />
        <MetricCard label="Accuracy" value={`${summary.accuracy.percent}%`} detail={`${summary.accuracy.correct} correct · ${summary.accuracy.wrong} missed`} />
        <MetricCard label="Review consistency" value={`${summary.reviewConsistency.percent}%`} detail={`${summary.reviewConsistency.completedDays} of ${summary.reviewConsistency.windowDays} days · ${summary.reviewConsistency.totalReviews} reviews`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-heading text-base font-bold">Current level</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your XP journey through the level curve.</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="font-heading text-4xl font-bold">Level {level.level}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{level.into} / {level.span} XP</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-foreground bg-card">
              <div className="h-full bg-mint" style={{ width: `${level.pct}%` }} />
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-muted-foreground">{level.pct}% to next level</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-heading text-base font-bold">Book progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">How much of each book you have learned.</p>
            <div className="mt-4 flex flex-col gap-4">
              {summary.bookProgress.map((progress) => {
                const book = books?.find((item) => item.id === progress.book_id)
                const percent = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0
                return (
                  <div key={progress.book_id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-heading font-bold">{book?.name ?? progress.book_id}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{progress.learned}/{progress.total}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
                      <div className="h-full bg-coral" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-heading text-base font-bold">Daily activity</h2>
              <span className="text-xs font-medium text-muted-foreground">{last7Words} words this week</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">New words completed over the last 14 days.</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.weeklyActivity} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
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

        <Card>
          <CardContent className="p-5">
            <h2 className="font-heading text-base font-bold">Words learned (cumulative)</h2>
            <p className="mb-4 text-sm text-muted-foreground">Momentum across the last 14 days.</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.weeklyActivity} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={1} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                  <Tooltip cursor={{ stroke: 'var(--muted-foreground)' }} content={<ChartTip unit="words total" dataKey="cumulative" />} />
                  <Line type="monotone" dataKey="cumulative" stroke="var(--coral)" strokeWidth={3} dot={{ fill: 'var(--coral)', stroke: 'var(--foreground)', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, stroke: 'var(--foreground)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-heading text-base font-bold">Mastery breakdown</h2>
          <p className="mb-4 text-sm text-muted-foreground">{totalTracked.toLocaleString()} words in progress across all levels.</p>
          <div className="flex flex-col gap-3">
            {STATUS_ORDER.map((status) => {
              const value = counts[status]
              const pct = totalTracked > 0 ? Math.round((value / totalTracked) * 100) : 0
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="inline-block size-3 rounded-sm border-2 border-foreground" style={{ backgroundColor: STATUS_COLOR[status] }} aria-hidden />
                      {statusLabel(status)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{value.toLocaleString()} · {pct}%</span>
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

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card flat className="border-foreground/15 bg-muted/40">
      <CardContent className="flex items-center gap-3 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-mint-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
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
      <p className="text-muted-foreground">{value} {unit}</p>
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  )
}
