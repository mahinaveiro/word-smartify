'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { useBooks, useProfile } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { DailyGoal } from '@/types/database'

const GOAL_OPTIONS: readonly DailyGoal[] = [5, 10, 15, 20, 30]

export function SetupView() {
  const profileQuery = useProfile()
  const booksQuery = useBooks()
  const { updateProfile, revalidateUser } = useActions()
  const { toast } = useToast()
  const router = useRouter()
  const { data: profile } = profileQuery
  const { data: books } = booksQuery
  const [step, setStep] = useState<1 | 2>(1)
  const [dailyGoalDraft, setDailyGoalDraft] = useState<DailyGoal | null>(null)
  const [bookIdDraft, setBookIdDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (profileQuery.isLoading || booksQuery.isLoading) return <SetupSkeleton />
  if (profileQuery.error || booksQuery.error) {
    return (
      <ErrorState
        title="Setup couldn't be loaded"
        description="Your account is safe. Try loading the setup choices again."
        onRetry={() => Promise.all([profileQuery.mutate(), booksQuery.mutate()])}
      />
    )
  }
  if (!profile) return <ErrorState title="Your profile is unavailable" description="We couldn't find the account profile needed for setup." onRetry={() => profileQuery.mutate()} />

  const dailyGoal = dailyGoalDraft ?? profile.daily_goal
  const bookId = bookIdDraft ?? profile.current_book_id
  const selectedBook = books?.find((book) => book.id === bookId) ?? null

  async function finishSetup() {
    if (!dailyGoal || !bookId || saving) return
    setSaving(true)
    try {
      const updated = await updateProfile({ daily_goal: dailyGoal, current_book_id: bookId })
      await profileQuery.mutate(updated, false)
      await revalidateUser()
      toast({ title: 'Your plan is ready', description: 'Your daily learning plan has been set up.', tone: 'success' })
      window.sessionStorage.setItem('word-smartify:show-install-prompt', '1')
      router.replace('/dashboard')
    } catch {
      toast({ title: 'Setup could not be saved', description: 'Your choices are unchanged. Try again.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 py-8">
      <PageHeader title={step === 1 ? 'Set your daily goal' : 'Choose your starting book'} />

      {step === 1 ? (
        <Card>
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="font-heading text-lg font-bold">How many new words do you want to learn each day?</h2>
              <p className="mt-1 text-sm text-muted-foreground">This controls the number of new words in your daily plan and helps keep your streak realistic.</p>
            </div>
            <div className="grid grid-cols-5 gap-2.5" role="group" aria-label="Daily goal">
              {GOAL_OPTIONS.map((goal) => {
                const active = dailyGoal === goal
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setDailyGoalDraft(goal)}
                    aria-pressed={active}
                    className={cn(
                      'press grid h-14 place-items-center rounded-md border-2 border-foreground font-heading text-lg font-bold shadow-brutal-sm transition-colors',
                      active ? 'bg-mint text-mint-foreground' : 'bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {goal}
                  </button>
                )
              })}
            </div>
            <Button className="self-end" onClick={() => setStep(2)} disabled={!dailyGoal}>
              Continue <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <h2 className="font-heading text-lg font-bold">Which book do you want to start with?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Start with a real Word Smart book. You can switch your active book later.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {(books ?? []).map((book) => {
                const active = book.id === bookId
                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={book.is_locked}
                    onClick={() => setBookIdDraft(book.id)}
                    aria-pressed={active}
                    className={cn(
                      'press flex items-center gap-3 rounded-md border-2 border-foreground p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active ? 'bg-mint text-mint-foreground shadow-brutal-sm' : 'bg-card hover:bg-muted',
                    )}
                  >
                    <BookOpen className="size-5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading font-bold">{book.name}</p>
                      <p className={cn('text-sm', active ? 'text-mint-foreground/80' : 'text-muted-foreground')}>
                        {book.word_count.toLocaleString()} words{book.description ? ` · ${book.description}` : ''}
                      </p>
                    </div>
                    {active ? <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>Back</Button>
              <Button onClick={finishSetup} disabled={!dailyGoal || !selectedBook || saving} loading={saving}>
                Finish setup <Check className="size-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SetupSkeleton() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-5 py-8">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}
