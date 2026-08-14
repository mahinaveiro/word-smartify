import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getSupabaseConfig } from './config'

let browserClient: SupabaseClient<Database> | undefined

/** A single browser client per tab; the SSR package owns Auth persistence. */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseConfig().url,
      getSupabaseConfig().publishableKey,
    )
  }
  return browserClient
}
