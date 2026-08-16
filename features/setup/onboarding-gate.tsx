'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/hooks/use-data'
import { PostSetupPrompts } from '@/features/setup/post-setup-prompts'

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const profileQuery = useProfile()
  const profile = profileQuery.data
  const isSetupRoute = pathname === '/setup'
  const needsSetup = Boolean(profile && profile.current_book_id == null)

  useEffect(() => {
    if (needsSetup && !isSetupRoute) router.replace('/setup')
    if (!needsSetup && isSetupRoute) router.replace('/dashboard')
  }, [isSetupRoute, needsSetup, router])

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (profileQuery.error) {
    return <ErrorState title="Your account couldn't be loaded" description="Your account is safe. Try refreshing to continue." onRetry={() => profileQuery.mutate()} />
  }
  if (!profile) {
    return <ErrorState title="Your profile is unavailable" description="We couldn't find the profile needed to continue." onRetry={() => profileQuery.mutate()} />
  }
  if (!isSetupRoute && needsSetup) return null
  if (isSetupRoute && !needsSetup) return null
  return (
    <>
      {children}
      {!isSetupRoute && !needsSetup ? <PostSetupPrompts userId={profile.id} joined={profile.study_gc_joined} /> : null}
    </>
  )
}
