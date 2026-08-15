'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, KeyRound, Save, BookOpen, LogOut, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Avatar } from '@/features/shared/avatar'
import { AvatarPicker, DisplayNameField, profileSaveDisabled } from '@/features/profile/profile-form'
import { PasswordChecklist } from '@/features/auth/password-checklist'
import { PasswordField } from '@/features/auth/password-field'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useProfile, useBooks } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useAuth } from '@/features/auth/auth-provider'
import { checkPassword } from '@/lib/password'
import { validateAvatarUrl } from '@/lib/profile'
import { isAuthError } from '@/types/auth'
import type { DailyGoal } from '@/types/database'

const GOAL_OPTIONS: readonly DailyGoal[] = [5, 10, 15, 20, 30]

export function SettingsView() {
  const profileQuery = useProfile()
  const booksQuery = useBooks()
  const { data: profile, mutate: mutateProfile } = profileQuery
  const { data: books } = booksQuery
  const { updateProfile, revalidateUser } = useActions()
  const { toast } = useToast()
  const { user, signOut, changePassword, deleteAccount } = useAuth()
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

  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null)
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null)
  const [dailyGoalDraft, setDailyGoalDraft] = useState<DailyGoal | null>(null)
  const [bookIdDraft, setBookIdDraft] = useState<string | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleting, setDeleting] = useState(false)

  const name = nameDraft ?? profile?.display_name ?? ''
  const avatarId = avatarDraft ?? profile?.avatar_id ?? 'mint'
  const avatarUrl = avatarUrlDraft ?? profile?.avatar_url ?? ''
  const avatarUrlError = validateAvatarUrl(avatarUrl)
  const dailyGoal = dailyGoalDraft ?? profile?.daily_goal ?? 10
  const bookId = bookIdDraft === undefined ? profile?.current_book_id ?? null : bookIdDraft

  if (profileQuery.isLoading) return <SettingsSkeleton />
  if (profileQuery.error) {
    return (
      <ErrorState
        title="Settings couldn't be loaded"
        description="Your saved preferences are safe. Try loading Settings again."
        onRetry={() => profileQuery.mutate()}
      />
    )
  }
  if (!profile) {
    return <ErrorState title="Settings are unavailable" description="We couldn't find your profile settings. Try again." onRetry={() => profileQuery.mutate()} />
  }

  const dirty =
    name.trim() !== profile.display_name ||
    avatarId !== profile.avatar_id ||
    avatarUrl.trim() !== (profile.avatar_url ?? '') ||
    dailyGoal !== profile.daily_goal ||
    bookId !== profile.current_book_id

  async function onSave() {
    if (profileSaveDisabled(name, saving) || avatarUrlError) return
    setSaving(true)
    setSaveError(false)
    try {
      const updated = await updateProfile({
        display_name: name.trim(),
        avatar_id: avatarId,
        avatar_url: avatarUrl.trim() || null,
        daily_goal: dailyGoal,
        current_book_id: bookId,
      })
      await mutateProfile(updated, false)
      await revalidateUser()
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.', tone: 'success' })
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  async function onChangePassword() {
    setPasswordError(null)
    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (!checkPassword(newPassword).valid) {
      setPasswordError('New password does not meet the requirements below.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: 'Password changed', description: 'Your new password is active.', tone: 'success' })
    } catch (error) {
      if (isAuthError(error)) {
        if (error.code === 'invalid_credentials') setPasswordError('Your current password is incorrect.')
        else if (error.code === 'weak_password') setPasswordError('New password does not meet the requirements below.')
        else setPasswordError(error.message)
      } else {
        setPasswordError('Could not change your password. Try again.')
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  async function onDeleteAccount() {
    if (deletePhrase !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteAccount()
      setDeleteOpen(false)
      router.replace('/auth')
    } catch (error) {
      setDeleting(false)
      toast({
        title: isAuthError(error) ? error.message : 'Could not delete your account.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your profile and learning preferences."
        actions={(
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
        )}
      />

      {/* Profile */}
      <section>
        <SectionHeader title="Profile" />
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-4">
              <Avatar name={name || profile.display_name} avatarId={avatarId} avatarUrl={avatarUrl || null} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold">Avatar</p>
                <p className="text-xs text-muted-foreground">Use a preset color or add an external image URL.</p>
              </div>
            </div>

            <AvatarPicker name={name || profile.display_name} value={avatarId} onChange={(value) => setAvatarDraft(value)} disabled={saving} />
            <Field
              label="External image URL (optional)"
              htmlFor="avatar-url"
              hint="Only http:// and https:// links are accepted. Clear the field to use the preset avatar."
              error={avatarUrlError ?? undefined}
            >
              <Input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrlDraft(event.target.value)}
                placeholder="https://example.com/avatar.jpg"
                autoComplete="url"
                aria-invalid={Boolean(avatarUrlError)}
                disabled={saving}
              />
            </Field>
            <DisplayNameField value={name} onChange={(value) => setNameDraft(value)} disabled={saving} />
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
                    onClick={() => setDailyGoalDraft(g)}
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
            {booksQuery.error ? (
              <ErrorState
                className="py-6"
                title="Books couldn't be loaded"
                description="Your current book is unchanged. Try loading the choices again."
                onRetry={() => booksQuery.mutate()}
              />
            ) : null}
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

      <section>
        <SectionHeader title="Change password" />
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <PasswordField id="current-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <div>
              <PasswordField id="new-password" label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
              <PasswordChecklist value={newPassword} />
            </div>
            <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={passwordError ?? undefined} />
            <Button variant="outline" className="self-start" onClick={onChangePassword} loading={passwordSaving} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>
              <KeyRound className="size-4" aria-hidden /> Change password
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeader title="Danger zone" />
        <Card className="border-coral">
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="text-sm text-muted-foreground">Deleting your account permanently removes your profile, progress, daily history, and mock tests from this local device.</p>
            <Button variant="destructive" className="self-start" onClick={() => { setDeletePhrase(''); setDeleteOpen(true) }}>
              <Trash2 className="size-4" aria-hidden /> Delete account
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Save action */}
      <div
        className={cn(
          'z-10 translate-y-1 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
          dirty ? 'sticky bottom-20 translate-y-0 sm:bottom-6' : 'relative',
        )}
      >
        {saveError ? (
          <ErrorState
            className="mb-3 py-6"
            title="Your settings couldn't be saved"
            description="Your previous preferences are unchanged. Try saving again."
            onRetry={onSave}
          />
        ) : null}
        <Button size="lg" className="w-full" onClick={onSave} disabled={!dirty || profileSaveDisabled(name, saving) || Boolean(avatarUrlError)} loading={saving}>
          <Save className="size-5" aria-hidden />
          {dirty ? 'Save changes' : 'All changes saved'}
        </Button>
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false) }}
        title="Delete your account?"
        description="This cannot be undone. Type DELETE to confirm that you want to erase your local account data."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={onDeleteAccount} loading={deleting} disabled={deletePhrase !== 'DELETE' || deleting}>Delete permanently</Button>
          </>
        }
      >
        <Field label="Type DELETE to continue" htmlFor="delete-confirmation">
          <Input id="delete-confirmation" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" autoFocus />
        </Field>
      </Modal>
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
