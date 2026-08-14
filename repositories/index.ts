/** Supabase is the sole production repository implementation. */

import type { Repositories } from './interfaces'
import { createClient } from '@/lib/supabase/client'
import { createSupabaseRepositories } from './supabase'

export const repositories: Repositories = createSupabaseRepositories(createClient())
export type * from './interfaces'
