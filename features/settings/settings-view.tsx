'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Save, BookOpen, LogOut } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { Avatar, AVATAR_OPTIONS } from '@/features/shared/avatar'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useProfile, useBooks } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useAuth } from '@/features/auth/auth-provider'

const GOAL_OPTIONS = [5, 10, 15, 20, 30]

export function SettingsView() {
  const { data: profile } = useProfile()
  const { data: books } = useBooks()
  const { updateProfile, revalidateUser } = useActions()
  const { toast } = useToast()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function onSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/auth')
    } catch {
      setSigningOut(false)
      toast({ title: 'Could not sign out. Try again.', tone: 'error' })
    }
  }

  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState('mint')
  const [dailyGoal, setDailyGoal] = useState(10)
  const [bookId, setBookId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Hydrate local form state once the profile loads.
  useEffect(() => {
    if (!profile) return
    setName(profile.display_name)
    setAvatarId(profile.avatar_id)
    setDailyGoal(profile.daily_goal)
    setBookId(profile.current_book_id)
  }, [profile])

  if (!profile) return <SettingsSkeleton />

  const dirty =
    name.trim() !== profile.display_name ||
    avatarId !== profile.avatar_id ||
    dailyGoal !== profile.daily_goal ||
    bookId !== profile.current_book_id

  async function onSave() {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a display name.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        display_name: name.trim(),
        avatar_id: avatarId,
        daily_goal: dailyGoal,
        current_book_id: bookId,
      })
      revalidateUser()
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.', tone: 'success' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Preferences" title="Settings" description="Manage your profile and learning preferences." />

      {/* Profile */}
      <section>
        <SectionHeader title="Profile" />
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-4">
              <Avatar name={name || profile.display_name} avatarId={avatarId} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold">Avatar</p>
                <p className="text-xs text-muted-foreground">Pick a color for your profile badge.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Choose avatar color">
              {AVATAR_OPTIONS.map((opt) => {
                const active = opt === avatarId
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvatarId(opt)}
                    aria-pressed={active}
                    aria-label={`Avatar color ${opt}`}
                    className={cn(
                      'press relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                  >
                    <Avatar name={name || profile.display_name} avatarId={opt} size="md" />
                    {active ? (
                      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-foreground bg-foreground text-primary-foreground">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            <Field label="Display name" htmlFor="display-name">
              <Input
                id="display-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
          </CardContent>
        </Card>
      </section>

      {/* Daily goal */}
      <section>
        <SectionHeader title="Daily goal" />
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              Number of new words to complete each day to keep your streak.
            </p>
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Daily goal">
              {GOAL_OPTIONS.map((g) => {
                const active = g === dailyGoal
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setDailyGoal(g)}
                    aria-pressed={active}
                    className={cn(
                      'press grid h-12 w-12 place-items-center rounded-md border-2 border-foreground font-heading font-bold shadow-brutal-sm transition-colors',
                      active ? 'bg-mint text-mint-foreground' : 'bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Current book */}
      <section>
        <SectionHeader title="Active book" />
        <Card>
          <CardContent className="flex flex-col gap-2.5 p-5">
            <p className="mb-1 text-sm text-muted-foreground">
              Choose which book powers your dashboard and levels.
            </p>
            {(books ?? []).map((book) => {
              const active = book.id === bookId
              return (
                <button
                  key={book.id}
                  type="button"
                  disabled={book.is_locked}
                  onClick={() => setBookId(book.id)}
                  aria-pressed={active}
                  className={cn(
                    'press flex items-center gap-3 rounded-md border-2 border-foreground p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    active ? 'bg-mint text-mint-foreground shadow-brutal-sm' : 'bg-card hover:bg-muted',
                  )}
                >
                  <BookOpen className="size-5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold">{book.name}</p>
                    <p className={cn('text-xs', active ? 'text-mint-foreground/80' : 'text-muted-foreground')}>
                      {book.word_count.toLocaleString()} words
                      {book.is_locked ? ' · Locked' : ''}
                    </p>
                  </div>
                  {active ? <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden /> : null}
                </button>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {/* Account */}
      <section>
        <SectionHeader title="Account" />
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            {user ? (
              <div>
                <p className="font-heading text-sm font-semibold">Signed in as</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            ) : null}
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onSignOut}
              loading={signingOut}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Sticky save */}
      <div className="sticky bottom-20 z-10 sm:bottom-6">
        <Button size="lg" className="w-full" onClick={onSave} disabled={!dirty || saving} loading={saving}>
          <Save className="size-5" aria-hidden />
          {dirty ? 'Save changes' : 'All changes saved'}
        </Button>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-40" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
