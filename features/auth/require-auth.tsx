'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './auth-provider'
import { AuthLoading } from './auth-loading'

/**
 * Client guard for the authenticated app group. While the session is
 * resolving it shows a spinner; if there is no session it redirects to
 * /auth carrying a safe `next` param so the user returns where they were.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (loading) return
    if (!user) {
      const qs = searchParams.toString()
      const next = qs ? `${pathname}?${qs}` : pathname
      router.replace(`/auth?next=${encodeURIComponent(next)}`)
    }
  }, [user, loading, pathname, searchParams, router])

  if (loading || !user) return <AuthLoading />

  return <>{children}</>
}
