'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  Check,
  KeyRound,
  LogOut,
  MessageSquare,
  Save,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { SectionHeader } from '@/components/ui/section-header'
import { AvatarUpload, profileSaveDisabled } from '@/features/profile/profile-form'
import { PasswordChecklist } from '@/features/auth/password-checklist'
import { PasswordField } from '@/features/auth/password-field'
import { FeedbackView } from './feedback-view'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useProfile, useBooks } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useAuth } from '@/features/auth/auth-provider'
import { checkPassword } from '@/lib/password'
import { validateDisplayName } from '@/lib/profile'
import { isAuthError } from '@/types/auth'
import type { DailyGoal, Profile } from '@/types/database'

const GOAL_OPTIONS: readonly DailyGoal[] = [5, 10, 15, 20, 30]

export type SettingsSection = 'hub' | 'profile' | 'learning' | 'account' | 'security' | 'danger' | 'feedback'

const SECTION_META: Record<Exclude<SettingsSection, 'hub'>, { title: string; backLabel: string }> = {
  profile: { title: 'Profile settings', backLabel: 'Back to settings' },
  learning: { title: 'Learning preferences', backLabel: 'Back to settings' },
  account: { title: 'Account settings', backLabel: 'Back to settings' },
  security: { title: 'Security', backLabel: 'Back to settings' },
  danger: { title: 'Danger zone', backLabel: 'Back to settings' },
  feedback: { title: 'Help & feedback', backLabel: 'Back to settings' },
}

export function SettingsView({ section = 'hub' }: { section?: SettingsSection }) {
  const profileQuery = useProfile()
  const booksQuery = useBooks()
  const { data: profile, mutate: mutateProfile } = profileQuery
  const { data: books } = booksQuery
  const { updateProfile, revalidateUser } = useActions()
  const { toast } = useToast()
  const { user, signOut, changePassword, deleteAccount } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const [firstNameDraft, setFirstNameDraft] = useState<string | null>(null)
  const [lastNameDraft, setLastNameDraft] = useState<string | null>(null)
  const [dailyGoalDraft, setDailyGoalDraft] = useState<DailyGoal | null>(null)
  const [bookIdDraft, setBookIdDraft] = useState<string | null | undefined>(undefined)
  const [profileSaving, setProfileSaving] = useState(false)
  const [learningSaving, setLearningSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState(false)
  const [learningSaveError, setLearningSaveError] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const nameParts = splitDisplayName(profile.display_name)
  const firstName = firstNameDraft ?? nameParts.first
  const lastName = lastNameDraft ?? nameParts.last
  const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  const nameError = validateDisplayName(name)
  const avatarId = profile.avatar_id ?? 'mint'
  const avatarUrl = profile.avatar_url ?? ''
  const dailyGoal = dailyGoalDraft ?? profile.daily_goal ?? 10
  const bookId = bookIdDraft === undefined ? profile.current_book_id ?? null : bookIdDraft
  const activeBook = (books ?? []).find((book) => book.id === bookId)

  const profileDirty = name.trim() !== profile.display_name
  const learningDirty = dailyGoal !== profile.daily_goal || bookId !== profile.current_book_id

  async function onSaveProfile() {
    if (profileSaveDisabled(name, profileSaving)) return
    setProfileSaving(true)
    setProfileSaveError(false)
    try {
      const updated = await updateProfile({ display_name: name.trim() })
      await mutateProfile(updated, false)
      await revalidateUser()
      toast({ title: 'Profile saved', description: 'Your profile has been updated.', tone: 'success' })
    } catch {
      setProfileSaveError(true)
    } finally {
      setProfileSaving(false)
    }
  }

  async function onSaveLearning() {
    if (learningSaving) return
    setLearningSaving(true)
    setLearningSaveError(false)
    try {
      const updated = await updateProfile({
        daily_goal: dailyGoal,
        current_book_id: bookId,
      })
      await mutateProfile(updated, false)
      await revalidateUser()
      toast({ title: 'Learning plan saved', description: 'Your study preferences have been updated.', tone: 'success' })
    } catch {
      setLearningSaveError(true)
    } finally {
      setLearningSaving(false)
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

  const headerTitle = section === 'hub' ? 'Settings' : SECTION_META[section].title
  const headerBack = section === 'hub' ? '/profile' : '/settings'
  const headerBackLabel = section === 'hub' ? 'Back to profile' : SECTION_META[section].backLabel

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={headerTitle}
        leading={<BackButton href={headerBack} label={headerBackLabel} className="md:hidden" />}
      />

      {section === 'hub' ? (
        <SettingsHub profileName={profile.display_name} userEmail={user?.email ?? null} dailyGoal={profile.daily_goal} activeBookName={activeBook?.name ?? null} />
      ) : null}

      {section === 'feedback' ? <FeedbackView /> : null}

      {section === 'profile' ? (
        <ProfileSettings
          name={name}
          firstName={firstName}
          lastName={lastName}
          nameError={nameError}
          userId={user?.id ?? profile.id}
          avatarId={avatarId}
          avatarUrl={avatarUrl}
          profileSaving={profileSaving}
          profileSaveError={profileSaveError}
          profileDirty={profileDirty}
          onFirstNameChange={setFirstNameDraft}
          onLastNameChange={setLastNameDraft}
          onSave={onSaveProfile}
          onProfileUpdated={async (updated) => {
            await mutateProfile(updated, false)
          }}
        />
      ) : null}

      {section === 'learning' ? (
        <LearningSettings
          books={books ?? []}
          booksError={booksQuery.error}
          dailyGoal={dailyGoal}
          bookId={bookId}
          learningSaving={learningSaving}
          learningSaveError={learningSaveError}
          learningDirty={learningDirty}
          onGoalChange={setDailyGoalDraft}
          onBookChange={setBookIdDraft}
          onSave={onSaveLearning}
          onRetryBooks={() => booksQuery.mutate()}
        />
      ) : null}

      {section === 'account' ? <AccountSettings email={user?.email ?? null} signingOut={signingOut} onSignOut={onSignOut} /> : null}

      {section === 'security' ? (
        <SecuritySettings
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          passwordError={passwordError}
          passwordSaving={passwordSaving}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onChangePassword={onChangePassword}
        />
      ) : null}

      {section === 'danger' ? <DangerSettings onDelete={() => { setDeletePhrase(''); setDeleteOpen(true) }} /> : null}

      <DeleteAccountModal
        open={deleteOpen}
        deletePhrase={deletePhrase}
        deleting={deleting}
        onPhraseChange={setDeletePhrase}
        onClose={() => { if (!deleting) setDeleteOpen(false) }}
        onCancel={() => setDeleteOpen(false)}
        onDelete={onDeleteAccount}
      />
    </div>
  )
}

function SettingsHub({
  profileName,
  userEmail,
  dailyGoal,
  activeBookName,
}: {
  profileName: string
  userEmail: string | null
  dailyGoal: DailyGoal
  activeBookName: string | null
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup title="Personal">
        <SettingsRow
          href="/settings/profile"
          icon={UserRound}
          title="Profile settings"
          description="Name and profile picture"
          value={profileName}
        />
        <SettingsRow
          href="/settings/account"
          icon={Shield}
          title="Account settings"
          description="Email and sign out"
          value={userEmail}
        />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow
          href="/settings/learning"
          icon={BookOpen}
          title="Learning preferences"
          description="Daily goal and active book"
          value={activeBookName ? `${dailyGoal} words · ${activeBookName}` : `${dailyGoal} words per day`}
        />
      </SettingsGroup>

      <SettingsGroup title="Security">
        <SettingsRow
          href="/settings/security"
          icon={KeyRound}
          title="Password"
          description="Change your password"
        />
      </SettingsGroup>

      <SettingsGroup title="Account actions">
        <SettingsRow
          href="/settings/danger"
          icon={Trash2}
          title="Delete account"
          description="Permanently delete your account"
          destructive
        />
      </SettingsGroup>

      <SettingsGroup title="Help">
        <SettingsRow
          href="/settings/feedback"
          icon={MessageSquare}
          title="Help & feedback"
          description="Share an idea or report a problem"
        />
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} />
      <Card className="overflow-hidden">
        <div className="divide-y-2 divide-foreground/10">{children}</div>
      </Card>
    </section>
  )
}

function SettingsRow({
  href,
  icon: Icon,
  title,
  description,
  value,
  destructive = false,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  value?: string | null
  destructive?: boolean
}) {
  return (
    <Link
      href={href}
      className="press group flex min-h-20 items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground', destructive ? 'bg-coral text-coral-foreground' : 'bg-mint text-mint-foreground')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-sm font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-right">
        {value ? <span className="hidden max-w-44 truncate text-xs text-muted-foreground sm:block">{value}</span> : null}
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

function ProfileSettings({
  name,
  firstName,
  lastName,
  nameError,
  userId,
  avatarId,
  avatarUrl,
  profileSaving,
  profileSaveError,
  profileDirty,
  onFirstNameChange,
  onLastNameChange,
  onSave,
  onProfileUpdated,
}: {
  name: string
  firstName: string
  lastName: string
  nameError: string | null
  userId: string
  avatarId: string
  avatarUrl: string
  profileSaving: boolean
  profileSaveError: boolean
  profileDirty: boolean
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onSave: () => void
  onProfileUpdated: (profile: Profile) => Promise<unknown> | unknown
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="Name" />
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="first-name" error={nameError ?? undefined}>
              <Input id="first-name" value={firstName} onChange={(event) => onFirstNameChange(event.target.value)} autoComplete="given-name" disabled={profileSaving} placeholder="First name" />
            </Field>
            <Field label="Last name" htmlFor="last-name">
              <Input id="last-name" value={lastName} onChange={(event) => onLastNameChange(event.target.value)} autoComplete="family-name" disabled={profileSaving} placeholder="Last name" />
            </Field>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeader title="Profile picture" />
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <AvatarUpload
              userId={userId}
              name={name || 'Word Smartify'}
              avatarId={avatarId}
              avatarUrl={avatarUrl}
              disabled={profileSaving}
              onUpdated={onProfileUpdated}
            />
          </CardContent>
        </Card>
      </section>

      <SaveChangesAction dirty={profileDirty} saving={profileSaving} error={profileSaveError} disabled={profileSaveDisabled(name, profileSaving)} onSave={onSave} />
    </div>
  )
}

function LearningSettings({
  books,
  booksError,
  dailyGoal,
  bookId,
  learningSaving,
  learningSaveError,
  learningDirty,
  onGoalChange,
  onBookChange,
  onSave,
  onRetryBooks,
}: {
  books: Array<{ id: string; name: string; word_count: number; is_locked: boolean }>
  booksError?: unknown
  dailyGoal: DailyGoal
  bookId: string | null
  learningSaving: boolean
  learningSaveError: boolean
  learningDirty: boolean
  onGoalChange: (value: DailyGoal) => void
  onBookChange: (value: string) => void
  onSave: () => void
  onRetryBooks: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="Daily goal" />
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Daily goal">
              {GOAL_OPTIONS.map((goal) => {
                const active = goal === dailyGoal
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => onGoalChange(goal)}
                    aria-pressed={active}
                    disabled={learningSaving}
                    className={cn(
                      'press grid h-12 w-12 place-items-center rounded-md border-2 border-foreground font-heading font-bold shadow-brutal-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active ? 'bg-mint text-mint-foreground' : 'bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {goal}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeader title="Active book" />
        <Card>
          <CardContent className="flex flex-col gap-2.5 p-5">
            {booksError ? (
              <ErrorState
                className="py-6"
                title="Books couldn't be loaded"
                description="Your current book is unchanged. Try loading the choices again."
                onRetry={onRetryBooks}
              />
            ) : null}
            {!booksError && books.length === 0 ? <p className="text-sm text-muted-foreground">No books are available yet.</p> : null}
            {books.map((book) => {
              const active = book.id === bookId
              return (
                <button
                  key={book.id}
                  type="button"
                  disabled={book.is_locked || learningSaving}
                  onClick={() => onBookChange(book.id)}
                  aria-pressed={active}
                  className={cn(
                    'press flex items-center gap-3 rounded-md border-2 border-foreground p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    active ? 'bg-mint text-mint-foreground shadow-brutal-sm' : 'bg-card hover:bg-muted',
                  )}
                >
                  <BookOpen className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-sm font-bold">{book.name}</span>
                    <span className={cn('block text-xs', active ? 'text-mint-foreground/80' : 'text-muted-foreground')}>
                      {book.word_count.toLocaleString()} words
                      {book.is_locked ? ' · Locked' : ''}
                    </span>
                  </span>
                  {active ? <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden /> : null}
                </button>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <SaveChangesAction dirty={learningDirty} saving={learningSaving} error={learningSaveError} disabled={learningSaving} onSave={onSave} label="Save learning plan" />
    </div>
  )
}

function AccountSettings({ email, signingOut, onSignOut }: { email: string | null; signingOut: boolean; onSignOut: () => void }) {
  return (
    <section>
      <SectionHeader title="Account" />
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          {email ? (
            <div>
              <p className="font-heading text-sm font-semibold">Signed in as</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          ) : null}
          <Button variant="outline" className="w-full sm:w-auto" onClick={onSignOut} loading={signingOut}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function SecuritySettings({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordError,
  passwordSaving,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onChangePassword,
}: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  passwordError: string | null
  passwordSaving: boolean
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onChangePassword: () => void
}) {
  return (
    <section>
      <SectionHeader title="Password" />
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <PasswordField id="current-password" label="Current password" value={currentPassword} onChange={onCurrentPasswordChange} autoComplete="current-password" />
          <div>
            <PasswordField id="new-password" label="New password" value={newPassword} onChange={onNewPasswordChange} autoComplete="new-password" />
            <PasswordChecklist value={newPassword} />
          </div>
          <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={onConfirmPasswordChange} autoComplete="new-password" error={passwordError ?? undefined} />
          <Button variant="outline" className="self-start" onClick={onChangePassword} loading={passwordSaving} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>
            <KeyRound className="size-4" aria-hidden /> Change password
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function DangerSettings({ onDelete }: { onDelete: () => void }) {
  return (
    <section>
      <SectionHeader title="Delete account" />
      <Card className="border-coral">
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="text-sm text-muted-foreground">Permanently delete your account and all saved progress.</p>
          <Button variant="destructive" className="self-start" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden /> Delete account
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function SaveChangesAction({
  dirty,
  saving,
  error,
  disabled,
  onSave,
  label = 'Save changes',
}: {
  dirty: boolean
  saving: boolean
  error: boolean
  disabled: boolean
  onSave: () => void
  label?: string
}) {
  return (
    <div className={cn('z-10 translate-y-1 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none', dirty ? 'sticky bottom-20 translate-y-0 sm:bottom-6' : 'relative')}>
      {error ? (
        <ErrorState
          className="mb-3 py-6"
          title="Your changes couldn't be saved"
          description="Your previous settings are unchanged. Try saving again."
          onRetry={onSave}
        />
      ) : null}
      <Button size="lg" className="w-full" onClick={onSave} disabled={!dirty || disabled} loading={saving}>
        <Save className="size-5" aria-hidden />
        {dirty ? label : 'All changes saved'}
      </Button>
    </div>
  )
}

function DeleteAccountModal({
  open,
  deletePhrase,
  deleting,
  onPhraseChange,
  onClose,
  onCancel,
  onDelete,
}: {
  open: boolean
  deletePhrase: string
  deleting: boolean
  onPhraseChange: (value: string) => void
  onClose: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete your account?"
      description="This cannot be undone. Type DELETE to confirm that you want to erase your local account data."
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onDelete} loading={deleting} disabled={deletePhrase !== 'DELETE' || deleting}>Delete permanently</Button>
        </>
      )}
    >
      <Field label="Type DELETE to continue" htmlFor="delete-confirmation">
        <Input id="delete-confirmation" value={deletePhrase} onChange={(event) => onPhraseChange(event.target.value)} autoComplete="off" autoFocus />
      </Field>
    </Modal>
  )
}

function splitDisplayName(displayName: string) {
  const [first = '', ...rest] = displayName.trim().split(/\s+/).filter(Boolean)
  return { first, last: rest.join(' ') }
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
