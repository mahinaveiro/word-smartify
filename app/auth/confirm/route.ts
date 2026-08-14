import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-redirect'
import type { Database } from '@/types/supabase'
import { getSupabaseConfig } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNext(requestUrl.searchParams.get('next'))
  const destination = next === '/dashboard' ? '/auth/verified' : next
  const response = NextResponse.redirect(new URL(destination, requestUrl.origin))

  if (!code) {
    return NextResponse.redirect(new URL('/auth/verified?error=invalid-link', requestUrl.origin))
  }

  const supabase = createServerClient<Database>(
    getSupabaseConfig().url,
    getSupabaseConfig().publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const errorDestination = next === '/auth/reset-password' ? '/auth/reset-password?error=invalid-link' : '/auth/verified?error=invalid-link'
    return NextResponse.redirect(new URL(errorDestination, requestUrl.origin))
  }

  return response
}
