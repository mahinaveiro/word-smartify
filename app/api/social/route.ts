import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminRepositories } from '@/lib/supabase/admin'
import type { PresenceState } from '@/types/database'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) throw new Error(`Invalid ${field}.`)
  return value.trim()
}

function uuid(value: unknown, field: string): string {
  const result = stringValue(value, field, 80)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new Error(`Invalid ${field}.`)
  return result
}

async function authenticatedUser(request: Request) {
  const supabase = await createClient()
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const { data, error } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized')
  return data.user
}

export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request)
    const url = new URL(request.url)
    const view = url.searchParams.get('view') ?? 'friends'
    const repos = createAdminRepositories()
    if (view === 'friends') return NextResponse.json(await repos.social.getFriends(user.id))
    if (view === 'requests') return NextResponse.json(await repos.social.getRequests(user.id))
    if (view === 'privacy') return NextResponse.json(await repos.social.getPrivacy(user.id))
    if (view === 'search') return NextResponse.json(await repos.social.searchUsers(user.id, url.searchParams.get('q') ?? '', 12))
    throw new Error('Unknown social view.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The social request could not be completed.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request)
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) throw new Error('Invalid request.')
    const action = stringValue(parsed.action, 'action', 40)
    const repos = createAdminRepositories()

    switch (action) {
      case 'send_request':
        return NextResponse.json(await repos.social.sendFriendRequest(user.id, uuid(parsed.userId, 'userId')))
      case 'respond_request': {
        const response = stringValue(parsed.response, 'response', 20)
        if (!['accepted', 'declined', 'cancelled'].includes(response)) throw new Error('Invalid response.')
        await repos.social.respondToFriendRequest(user.id, uuid(parsed.friendshipId, 'friendshipId'), response as 'accepted' | 'declined' | 'cancelled')
        return NextResponse.json({ ok: true })
      }
      case 'remove_friend':
        await repos.social.removeFriend(user.id, uuid(parsed.friendshipId, 'friendshipId'))
        return NextResponse.json({ ok: true })
      case 'block_user':
        await repos.social.blockUser(user.id, uuid(parsed.userId, 'userId'))
        return NextResponse.json({ ok: true })
      case 'unblock_user':
        await repos.social.unblockUser(user.id, uuid(parsed.userId, 'userId'))
        return NextResponse.json({ ok: true })
      case 'update_privacy': {
        const patch = isRecord(parsed.patch) ? parsed.patch : {}
        const allowed = ['discoverable', 'friend_challenges_enabled', 'presence_visible'] as const
        const safePatch = Object.fromEntries(allowed.filter((key) => typeof patch[key] === 'boolean').map((key) => [key, patch[key]]))
        return NextResponse.json(await repos.social.updatePrivacy(user.id, safePatch))
      }
      case 'presence': {
        const stateValue = stringValue(parsed.state, 'state', 30)
        if (!['online', 'learning', 'reviewing', 'mock_test', 'in_combat', 'idle', 'offline'].includes(stateValue)) throw new Error('Invalid presence state.')
        const state = stateValue as PresenceState
        await repos.social.setPresence(user.id, state)
        return NextResponse.json({ ok: true })
      }
      default:
        throw new Error('Unknown social action.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The social action could not be completed.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
