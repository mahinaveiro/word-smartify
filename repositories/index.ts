/**
 * Repository entry point.
 *
 * The rest of the app imports `repositories` (and `CURRENT_USER_ID`) from here.
 * To move to Supabase later, swap `createLocalRepositories()` for
 * `createSupabaseRepositories()` — no UI or business-logic changes required.
 */

import type { Repositories } from './interfaces'
import { createLocalRepositories } from './local'
import { withDevelopmentFaults } from '@/lib/dev-faults'

export const repositories: Repositories = withDevelopmentFaults(createLocalRepositories())

export { CURRENT_USER_ID, getActiveUserId } from '@/data/local-store'
export type * from './interfaces'
