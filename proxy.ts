import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { safeNext } from '@/lib/safe-redirect'
import { getSupabaseConfig } from '@/lib/supabase/config'

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
  const isRootConfirmation = request.nextUrl.pathname === '/'
    && (request.nextUrl.searchParams.has('code') || request.nextUrl.searchParams.has('token_hash'))

  if (isRootConfirmation) {
    const confirmationUrl = request.nextUrl.clone()
    const code = request.nextUrl.searchParams.get('code')
    const tokenHash = request.nextUrl.searchParams.get('token_hash')
    const next = request.nextUrl.searchParams.get('next')
    confirmationUrl.pathname = '/auth/confirm'
    confirmationUrl.search = ''
    if (code) confirmationUrl.searchParams.set('code', code)
    if (tokenHash) confirmationUrl.searchParams.set('token_hash', tokenHash)
    if (request.nextUrl.searchParams.get('type')) {
      confirmationUrl.searchParams.set('type', request.nextUrl.searchParams.get('type')!)
    }
    confirmationUrl.searchParams.set('next', next || '/auth/verified')
    return NextResponse.redirect(confirmationUrl)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseConfig().url,
    getSupabaseConfig().publishableKey,
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
