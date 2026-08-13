'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './auth-provider'
import { AuthLoading } from './auth-loading'

/**
 * Reads the current path + query to build the `next` redirect target.
 * Isolated so `useSearchParams()` can sit inside its own Suspense boundary
 * without forcing the rest of the guard (or the pages under it) into a
 * client-only render — otherwise static prerendering of every page in the
 * (app) group fails with "useSearchParams() should be wrapped in a suspense
 * boundary".
 */
function RedirectToAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    const next = qs ? `${pathname}?${qs}` : pathname
    router.replace(`/auth?next=${encodeURIComponent(next)}`)
  }, [pathname, searchParams, router])

  return <AuthLoading />
}

/**
 * Client guard for the authenticated app group. While the session is
 * resolving it shows a spinner; if there is no session it redirects to
 * /auth carrying a safe `next` param so the user returns where they were.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <AuthLoading />

  if (!user) {
    return (
      <Suspense fallback={<AuthLoading />}>
        <RedirectToAuth />
      </Suspense>
    )
  }

  return <>{children}</>
}
