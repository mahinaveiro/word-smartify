'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen, Flame, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/features/shared/stat-tile'
import { Avatar } from '@/features/shared/avatar'
import { useBooks, usePublicProfile } from '@/hooks/use-data'

export function PublicProfileView({ userId }: { userId: string }) {
  const { data: profile, error, isLoading, mutate } = usePublicProfile(userId)
  const { data: books } = useBooks()

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
        <Button asChild variant="ghost" className="self-start px-0">
          <Link href="/leaderboard"><ArrowLeft className="size-4" aria-hidden /> Back to leaderboard</Link>
        </Button>
        <EmptyState title="Profile not found" description="This learner profile is no longer available." action={<Button asChild><Link href="/leaderboard">Back to leaderboard</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Learner profile"
        title={profile.display_name}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/leaderboard"><ArrowLeft className="size-4" aria-hidden /> Leaderboard</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar name={profile.display_name} avatarId={profile.avatar_id} size="xl" />
          <div>
            <h2 className="font-heading text-2xl font-bold">{profile.display_name}</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-coral px-2.5 py-1 text-sm font-heading font-bold text-coral-foreground">
                <Flame className="size-3.5" aria-hidden /> {profile.current_streak} day streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-foreground bg-mint px-2.5 py-1 text-sm font-heading font-bold text-mint-foreground">
                <Trophy className="size-3.5" aria-hidden /> {profile.total_xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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
