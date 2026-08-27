'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Award, BarChart3, BookOpen, Clock3, ExternalLink, Flame, Loader2, Medal, MessageCircle, Send, ShieldAlert, Target, Trophy, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/features/shared/stat-tile'
import { Avatar } from '@/features/shared/avatar'
import { useBooks, usePublicProfile } from '@/hooks/use-data'
import { useAuth } from '@/features/auth/auth-provider'
import { postSocial } from '@/features/combat/combat-api'
import { isOwnerUserId, OwnerDisplayName, STUDY_GC_DISCORD_URL, STUDY_GC_TELEGRAM_URL } from '@/lib/owner'

export function PublicProfileView({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fallbackPath = searchParams.get('from') === 'combat' ? '/combat' : '/leaderboard'
  const goBack = () => {
    if (window.history.length > 1) router.back()
    else router.replace(fallbackPath)
  }
  const { data: profile, error, isLoading, mutate } = usePublicProfile(userId)
  const { user } = useAuth()
  const { data: books } = useBooks()
  const [relationshipBusy, setRelationshipBusy] = useState(false)
  const [relationshipError, setRelationshipError] = useState<string | null>(null)
  const [unfriendOpen, setUnfriendOpen] = useState(false)

  const handleRelationshipAction = async () => {
    if (!profile || profile.id === user?.id || relationshipBusy) return
    const relationship = profile.relationship ?? 'none'
    const relationshipId = profile.relationship_id
    let action: Record<string, unknown>
    if (relationship === 'none') action = { action: 'send_request', userId: profile.id }
    else if (relationship === 'incoming_pending' && relationshipId) action = { action: 'respond_request', friendshipId: relationshipId, response: 'accepted' }
    else if (relationship === 'outgoing_pending' && relationshipId) action = { action: 'respond_request', friendshipId: relationshipId, response: 'cancelled' }
    else return
    setRelationshipBusy(true)
    setRelationshipError(null)
    try {
      await postSocial(action)
      await mutate()
    } catch (actionError) {
      setRelationshipError(actionError instanceof Error ? actionError.message : 'Friend action could not be completed.')
    } finally {
      setRelationshipBusy(false)
    }
  }

  const handleUnfriend = async () => {
    if (!profile || profile.id === user?.id || profile.relationship !== 'friends' || !profile.relationship_id || relationshipBusy) return
    setRelationshipBusy(true)
    setRelationshipError(null)
    try {
      await postSocial({ action: 'remove_friend', friendshipId: profile.relationship_id })
      setUnfriendOpen(false)
      await mutate()
    } catch (actionError) {
      setRelationshipError(actionError instanceof Error ? actionError.message : 'Unfriend action could not be completed.')
    } finally {
      setRelationshipBusy(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    const suffix = isOwnerUserId(profile.id) ? 'Word Smartify owner' : 'Word Smartify profile'
    document.title = `${profile.display_name} · ${suffix}`
    return () => {
      document.title = 'Word Smartify — Learn vocabulary, word by word'
    }
  }, [profile])

  if (isLoading) return <PublicProfileSkeleton />
  if (error) {
    return (
      <ErrorState
        title="Public profile couldn't be loaded"
        description="This learner profile could not be loaded. Try again."
        onRetry={() => mutate()}
      />
    )
  }
  if (!profile) {
    return (
            <div className="flex flex-col gap-4">
        <Button variant="ghost" className="self-start px-0" onClick={goBack}>
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        <EmptyState title="Profile not found" description="This learner profile is no longer available." action={<Button onClick={goBack}>Back</Button>} />
      </div>

    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<OwnerDisplayName userId={profile.id} name={profile.display_name} badges={profile.badges} className="text-balance" />}
        leading={<BackButton onClick={goBack} label="Back" />}
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar name={profile.display_name} avatarId={profile.avatar_id} avatarUrl={profile.avatar_url} size="xl" />
          <div className="min-w-0">
            <h2 className="flex items-center justify-center gap-2 font-heading text-2xl font-bold sm:justify-start">
              <span className="min-w-0 truncate"><OwnerDisplayName userId={profile.id} name={profile.display_name} badges={profile.badges} /></span>
              {user && user.id !== profile.id && profile.relationship !== 'blocked' ? profile.relationship === 'friends' ? <Button variant="outline" size="sm" className="size-8 shrink-0 rounded-full p-0 sm:h-9 sm:w-auto sm:rounded-md sm:px-2.5" onClick={() => setUnfriendOpen(true)} disabled={relationshipBusy || !profile.relationship_id} aria-label={`Unfriend ${profile.display_name}`}><UserMinus className="size-4" aria-hidden /><span className="hidden sm:inline">Unfriend</span></Button> : <Button variant={profile.relationship === 'incoming_pending' ? 'accent' : 'outline'} size="sm" className="size-8 shrink-0 rounded-full p-0 sm:h-9 sm:w-auto sm:rounded-md sm:px-2.5" onClick={() => void handleRelationshipAction()} disabled={relationshipBusy || (profile.relationship !== 'none' && !profile.relationship_id)} aria-label={profile.relationship === 'incoming_pending' ? `Accept ${profile.display_name}'s friend request` : profile.relationship === 'outgoing_pending' ? `Cancel friend request to ${profile.display_name}` : `Add ${profile.display_name} as a friend`}>{relationshipBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : profile.relationship === 'incoming_pending' ? <UserCheck className="size-4" aria-hidden /> : profile.relationship === 'outgoing_pending' ? <Clock3 className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}<span className="hidden sm:inline">{profile.relationship === 'incoming_pending' ? 'Accept request' : profile.relationship === 'outgoing_pending' ? 'Cancel request' : 'Add friend'}</span></Button> : null}
            </h2>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-coral px-2.5 py-1 text-sm font-heading font-bold text-coral-foreground">
                <Flame className="size-3.5" aria-hidden /> {profile.current_streak} day streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-mint px-2.5 py-1 text-sm font-heading font-bold text-mint-foreground">
                <Trophy className="size-3.5" aria-hidden /> {profile.total_xp.toLocaleString()} XP
              </span>
              {profile.leaderboard.all_time_rank ? (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-muted px-2.5 py-1 text-sm font-heading font-bold">
                  <Medal className="size-3.5" aria-hidden /> #{profile.leaderboard.all_time_rank} all time
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal open={unfriendOpen} onClose={() => setUnfriendOpen(false)} title={`Unfriend ${profile.display_name}?`} description="They will be removed from your friends list. You can send a new request later." footer={<><Button variant="ghost" size="sm" onClick={() => setUnfriendOpen(false)}>Keep friend</Button><Button variant="coral" size="sm" onClick={() => void handleUnfriend()} loading={relationshipBusy}>Unfriend <UserMinus className="size-3.5" aria-hidden /></Button></>}>
        <p className="text-sm text-muted-foreground">This only removes the friendship. It does not block the learner or affect your Combat history.</p>
      </Modal>
      <Modal open={Boolean(relationshipError)} onClose={() => setRelationshipError(null)} title="Friend action could not be completed" className="max-w-sm">
        <div role="alert" className="flex items-start gap-3 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><p>{relationshipError}</p></div>
      </Modal>

      {isOwnerUserId(profile.id) ? <StudyGcCommunityCard /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Trophy} value={profile.total_xp.toLocaleString()} label="Total XP" accent="ink" />
        <StatTile icon={BookOpen} value={profile.words_learned.toLocaleString()} label="Words learned" />
        <StatTile icon={Flame} value={profile.words_mastered.toLocaleString()} label="Words mastered" accent="mint" />
      </div>

      <section>
        <h2 className="mb-3 font-heading text-base font-bold uppercase tracking-wide">Book progress</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {profile.book_progress.map((progress) => {
            const percent = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0
            const bookName = books?.find((book) => book.id === progress.book_id)?.name ?? progress.book_id
            return (
              <Card key={progress.book_id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading font-bold">{bookName}</h3>
                    <span className="text-sm font-heading font-bold">{percent}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-card">
                    <div className="h-full bg-mint" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progress.learned.toLocaleString()} of {progress.total.toLocaleString()} learned · {progress.mastered.toLocaleString()} mastered
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold uppercase tracking-wide">Achievements</h2>
          <Award className="size-5 text-mint-foreground" aria-hidden />
        </div>
        {profile.achievements.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.achievements.map((badge) => (
              <Card key={badge.id} className={badge.id === 'word-smartify-owner' ? 'bg-coral shadow-brutal-md' : undefined}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className={badge.id === 'word-smartify-owner' ? 'grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground bg-card text-foreground shadow-brutal-sm' : 'grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm'}>
                    <Award className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold">{badge.title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-5 text-sm text-muted-foreground">This learner is building their first achievements.</CardContent></Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-heading text-base font-bold uppercase tracking-wide">Leaderboard record</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={Medal} value={profile.leaderboard.current_week_rank ? `#${profile.leaderboard.current_week_rank}` : '—'} label="This week" accent="mint" />
          <StatTile icon={Trophy} value={profile.leaderboard.all_time_rank ? `#${profile.leaderboard.all_time_rank}` : '—'} label="All time" />
          <StatTile icon={Trophy} value={profile.leaderboard.highest_weekly_rank ? `#${profile.leaderboard.highest_weekly_rank}` : '—'} label="Best weekly rank" />
          <StatTile icon={Target} value={profile.leaderboard.weekly_wins.toLocaleString()} label="Weekly wins" accent="mint" />
          <StatTile icon={Award} value={(profile.leaderboard.weekly_wins + profile.leaderboard.weekly_second_places + profile.leaderboard.weekly_third_places).toLocaleString()} label="Top 3 finishes" />
          <StatTile icon={Target} value={profile.leaderboard.weeks_ranked.toLocaleString()} label="Weeks ranked" />
          <StatTile icon={BarChart3} value={profile.leaderboard.best_weekly_xp.toLocaleString()} label="Best weekly XP" accent="ink" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-base font-bold uppercase tracking-wide">Mock-test record</h2>
        {profile.mock_tests.tests_taken === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">No mock tests yet.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <Metric label="Tests taken" value={profile.mock_tests.tests_taken.toLocaleString()} />
              <Metric label="Average score" value={profile.mock_tests.average_score == null ? '—' : `${profile.mock_tests.average_score}/10`} />
              <Metric label="Highest score" value={profile.mock_tests.highest_score == null ? '—' : `${profile.mock_tests.highest_score}/10`} />
              <Metric label="Best percentage" value={profile.mock_tests.best_percentage == null ? '—' : `${profile.mock_tests.best_percentage}%`} />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

function StudyGcCommunityCard() {
  return (
    <Card className="bg-muted">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-foreground bg-mint text-mint-foreground shadow-brutal-sm">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading font-bold">Study-GC community</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Join the conversation and help shape Word Smartify&apos;s next study features.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={STUDY_GC_TELEGRAM_URL} target="_blank" rel="noreferrer">
              <Send className="size-4" aria-hidden /> Telegram <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={STUDY_GC_DISCORD_URL} target="_blank" rel="noreferrer">
              Discord <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-heading text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function PublicProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-52" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      <Skeleton className="h-44 w-full" />
    </div>
  )
}
