import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { safeNext } from '@/lib/safe-redirect'

function requiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`)
  return value
}

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/learn',
  '/leaderboard',
  '/mock-tests',
  '/profile',
  '/progress',
  '/settings',
  '/word',
  '/challenge',
  '/review',
  '/session',
] as const

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/** Refreshes Auth cookies and enforces server-side identity checks before protected pages render. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // This verifies/refreshes the signed-in user's claims without trusting a
  // client-provided session object for authorization decisions.
  const { data: claimsData } = await supabase.auth.getClaims()

  if (isProtectedPath(request.nextUrl.pathname) && !claimsData?.claims?.sub) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    redirectUrl.search = ''
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    redirectUrl.searchParams.set('next', safeNext(requestedPath))

    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach(({ name, value }) => redirectResponse.cookies.set(name, value))
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
