import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminRepositories } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await createAdminRepositories().stats.updateStats(data.user.id, {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not provision the account.' }, { status: 500 })
  }
}
