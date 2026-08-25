import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createSupabaseRepositories } from '@/repositories/supabase'

/** Creates a service-role Supabase client for trusted server-side mutations only. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service-role configuration is missing.')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Creates a service-role repository for trusted server-side mutations only. */
export function createAdminRepositories() {
  return createSupabaseRepositories(createAdminClient())
}
