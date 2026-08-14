import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let browserClient: SupabaseClient<Database> | undefined

function requiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`)
  return value
}

/** A single browser client per tab; the SSR package owns Auth persistence. */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    )
  }
  return browserClient
}
