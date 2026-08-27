import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminRepositories } from '@/lib/supabase/admin'
import type { CombatPreset } from '@/types/database'

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

function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${field}.`)
  return value
}

async function authenticatedUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized')
  return data.user
}

export async function GET(request: Request) {
  try {
    const user = await authenticatedUser()
    const url = new URL(request.url)
    const repos = createAdminRepositories()
    if (url.searchParams.get('view') === 'history') return NextResponse.json(await repos.combat.getHistory(user.id, 20))
    if (url.searchParams.get('view') === 'invites') return NextResponse.json(await repos.combat.getInvites(user.id))
    if (url.searchParams.get('view') === 'question') {
      const matchId = uuid(url.searchParams.get('matchId'), 'matchId')
      const positionValue = Number(url.searchParams.get('position'))
      const position = integer(positionValue, 'position', 0, 20)
      return NextResponse.json(await repos.combat.getQuestion(user.id, matchId, position))
    }
    if (url.searchParams.get('view') === 'result') {
      const matchId = uuid(url.searchParams.get('matchId'), 'matchId')
      return NextResponse.json(await repos.combat.getResult(user.id, matchId))
    }
    const matchId = url.searchParams.get('matchId')
    const code = url.searchParams.get('code')
    if (matchId) return NextResponse.json(await repos.combat.getMatch(uuid(matchId, 'matchId'), user.id))
    if (code) return NextResponse.json(await repos.combat.getMatchByCode(code, user.id))
    throw new Error('A match or view is required.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Combat request could not be completed.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser()
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) throw new Error('Invalid request.')
    const action = stringValue(parsed.action, 'action', 40)
    const repos = createAdminRepositories()

    switch (action) {
      case 'create': {
        const preset = stringValue(parsed.preset ?? 'sprint', 'preset', 20) as CombatPreset
        const questionCount = integer(parsed.questionCount ?? (preset === 'standard' ? 10 : 5), 'questionCount', 3, 20)
        const timeLimitSeconds = integer(parsed.timeLimitSeconds ?? 15, 'timeLimitSeconds', 5, 60)
        const wagerXp = parsed.wagerXp === undefined ? 0 : integer(parsed.wagerXp, 'wagerXp', 0, 100)
        if (wagerXp !== 0 && wagerXp !== 100) throw new Error('The available XP wager is 100 XP.')
        return NextResponse.json(await repos.combat.createMatch(user.id, { preset, question_count: questionCount, time_limit_seconds: timeLimitSeconds, wager_xp: wagerXp as 0 | 100 }))
      }
      case 'join':
        return NextResponse.json(await repos.combat.joinMatch(user.id, stringValue(parsed.joinCode, 'joinCode', 20)))
      case 'invite_friend':
        return NextResponse.json(await repos.combat.inviteFriend(user.id, uuid(parsed.matchId, 'matchId'), uuid(parsed.recipientId, 'recipientId')))
      case 'respond_invite':
        return NextResponse.json(await repos.combat.respondToInvite(user.id, uuid(parsed.inviteId, 'inviteId'), parsed.response === 'accepted' ? 'accepted' : 'declined'))
      case 'ready':
        return NextResponse.json(await repos.combat.setReady(user.id, uuid(parsed.matchId, 'matchId'), parsed.ready === true))
      case 'start':
        return NextResponse.json(await repos.combat.startMatch(user.id, uuid(parsed.matchId, 'matchId')))
      case 'answer': {
        const selectedAnswer = parsed.selectedAnswer === null ? null : stringValue(parsed.selectedAnswer, 'selectedAnswer', 500)
        return NextResponse.json(await repos.combat.submitAnswer(
          user.id,
          uuid(parsed.matchId, 'matchId'),
          uuid(parsed.questionId, 'questionId'),
          selectedAnswer,
          integer(parsed.responseTimeMs, 'responseTimeMs', 0, 60000),
        ))
      }
      case 'cancel':
        await repos.combat.cancelMatch(user.id, uuid(parsed.matchId, 'matchId'))
        return NextResponse.json({ ok: true })
      case 'report':
        await repos.combat.reportMatch(
          user.id,
          uuid(parsed.matchId, 'matchId'),
          stringValue(parsed.reason, 'reason', 30) as 'question' | 'connection' | 'cheating' | 'harassment' | 'other',
          typeof parsed.note === 'string' ? parsed.note : undefined,
        )
        return NextResponse.json({ ok: true })
      default:
        throw new Error('Unknown Combat action.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Combat action could not be completed.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
