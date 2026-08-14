import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !projectUrl) {
    return NextResponse.json({ error: 'Account deletion is not configured on this deployment.' }, { status: 503 })
  }

  const admin = createAdminClient<Database>(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const userId = data.user.id

  const tests = await admin.from('mock_tests').select('id').eq('user_id', userId)
  if (tests.error) return NextResponse.json({ error: 'Account deletion failed.' }, { status: 500 })

  const testIds = (tests.data ?? []).map((test) => test.id)
  if (testIds.length) {
    const answers = await admin.from('mock_test_answers').delete().in('test_id', testIds)
    if (answers.error) return NextResponse.json({ error: 'Account deletion failed.' }, { status: 500 })
  }

  const deletes = await Promise.all([
    admin.from('mock_tests').delete().eq('user_id', userId),
    admin.from('user_word_progress').delete().eq('user_id', userId),
    admin.from('daily_progress').delete().eq('user_id', userId),
    admin.from('user_stats').delete().eq('user_id', userId),
    admin.from('profiles').delete().eq('id', userId),
  ])
  if (deletes.some((result) => result.error)) {
    return NextResponse.json({ error: 'Account deletion failed.' }, { status: 500 })
  }

  const result = await admin.auth.admin.deleteUser(userId)
  if (result.error) return NextResponse.json({ error: 'Account deletion failed.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
