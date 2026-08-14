import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getSupabaseConfig } from './config'

/** Creates a request-scoped client that reads/writes the Next.js cookie store. */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseConfig().url,
    getSupabaseConfig().publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components cannot always mutate cookies. The proxy performs
            // refresh writes, while this client remains safe for reads.
          }
        },
      },
    },
  )
}
