import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminRepositories } from '@/lib/supabase/admin'
import type { CombatPreset, CombatQuestionSource, CombatQuickMessage, CombatSourceMode } from '@/types/database'

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
    const repos = createAdminRepositories()
    if (url.searchParams.get('view') === 'history') return NextResponse.json(await repos.combat.getHistory(user.id, 20))
    if (url.searchParams.get('view') === 'invites') return NextResponse.json(await repos.combat.getInvites(user.id))
    if (url.searchParams.get('view') === 'question') {
      const matchId = uuid(url.searchParams.get('matchId'), 'matchId')
      const rawPosition = url.searchParams.get('position')
      if (rawPosition === null || rawPosition.trim().length === 0) throw new Error('A question position is required.')
      const position = integer(Number(rawPosition), 'position', 0, 20)
      return NextResponse.json(await repos.combat.getQuestion(user.id, matchId, position))
    }
    if (url.searchParams.get('view') === 'result') {
      const matchId = uuid(url.searchParams.get('matchId'), 'matchId')
      return NextResponse.json(await repos.combat.getResult(user.id, matchId))
    }
    if (url.searchParams.get('view') === 'messages') {
      const matchId = uuid(url.searchParams.get('matchId'), 'matchId')
      return NextResponse.json(await repos.combat.getMessages(user.id, matchId))
    }
    const matchId = url.searchParams.get('matchId')
    const code = url.searchParams.get('code')
    if (matchId) return NextResponse.json(await repos.combat.getMatch(uuid(matchId, 'matchId'), user.id))
    if (code !== null) {
      const normalizedCode = stringValue(code, 'code', 6).toUpperCase()
      if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) throw new Error('Invalid match code.')
      return NextResponse.json(await repos.combat.getMatchByCode(normalizedCode, user.id))
    }
    throw new Error('A match or view is required.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Combat request could not be completed.'
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
      case 'create': {
        const preset = stringValue(parsed.preset ?? 'sprint', 'preset', 20) as CombatPreset
        if (!(['sprint', 'standard', 'custom'] as string[]).includes(preset)) throw new Error('Invalid Combat preset.')
        const questionCount = integer(parsed.questionCount ?? (preset === 'standard' ? 10 : 5), 'questionCount', 3, 20)
        const timeLimitSeconds = integer(parsed.timeLimitSeconds ?? 15, 'timeLimitSeconds', 5, 60)
        const wagerXp = parsed.wagerXp === undefined ? 0 : integer(parsed.wagerXp, 'wagerXp', 0, 100)
        if (wagerXp !== 0 && wagerXp !== 100) throw new Error('The available XP wager is 100 XP.')
        const rawSource = isRecord(parsed.questionSource) ? parsed.questionSource : {}
        const mode = (typeof rawSource.mode === 'string' ? rawSource.mode : 'mixed') as CombatSourceMode
        if (!['mixed', 'level', 'book', 'letter', 'smart'].includes(mode)) throw new Error('Invalid question source.')
        const questionSource: CombatQuestionSource = { mode }
        if (mode === 'level') {
          const levelFromValue = rawSource.level_from ?? rawSource.levelFrom
          const levelToValue = rawSource.level_to ?? rawSource.levelTo ?? levelFromValue
          questionSource.level_from = integer(levelFromValue, 'levelFrom', 1, 104)
          questionSource.level_to = integer(levelToValue, 'levelTo', questionSource.level_from, 104)
        }
        if (mode === 'book') questionSource.book_id = uuid(rawSource.book_id ?? rawSource.bookId, 'bookId')
        if (mode === 'letter') {
          const letter = stringValue(rawSource.letter ?? 'A', 'letter', 1).toUpperCase()
          if (!/^[A-Z]$/.test(letter)) throw new Error('Choose a letter from A to Z.')
          questionSource.letter = letter
        }
        return NextResponse.json(await repos.combat.createMatch(user.id, { preset, question_count: questionCount, time_limit_seconds: timeLimitSeconds, wager_xp: wagerXp as 0 | 100, question_source: questionSource }))
      }
      case 'join':
        return NextResponse.json(await repos.combat.joinMatch(user.id, stringValue(parsed.joinCode, 'joinCode', 20)))
      case 'invite_friend':
        return NextResponse.json(await repos.combat.inviteFriend(user.id, uuid(parsed.matchId, 'matchId'), uuid(parsed.recipientId, 'recipientId')))
      case 'respond_invite': {
        const response = stringValue(parsed.response, 'response', 20)
        if (!['accepted', 'declined'].includes(response)) throw new Error('Invalid invitation response.')
        return NextResponse.json(await repos.combat.respondToInvite(user.id, uuid(parsed.inviteId, 'inviteId'), response as 'accepted' | 'declined'))
      }
      case 'ready':
        if (typeof parsed.ready !== 'boolean') throw new Error('Invalid ready state.')
        return NextResponse.json(await repos.combat.setReady(user.id, uuid(parsed.matchId, 'matchId'), parsed.ready))
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
      case 'heartbeat':
        return NextResponse.json(await repos.combat.heartbeat(user.id, uuid(parsed.matchId, 'matchId')))
      case 'leave':
        return NextResponse.json(await repos.combat.leaveMatch(user.id, uuid(parsed.matchId, 'matchId')))
      case 'forfeit':
        return NextResponse.json(await repos.combat.forfeitMatch(user.id, uuid(parsed.matchId, 'matchId')))
      case 'quick_message': {
        const message = stringValue(parsed.message, 'message', 40)
        if (!(['Good luck!', 'Nice one!', 'I’m ready!', 'That was close!'] as string[]).includes(message)) throw new Error('Invalid quick message.')
        return NextResponse.json(await repos.combat.sendQuickMessage(user.id, uuid(parsed.matchId, 'matchId'), message as CombatQuickMessage))
      }
      case 'cancel':
        await repos.combat.cancelMatch(user.id, uuid(parsed.matchId, 'matchId'))
        return NextResponse.json({ ok: true })
      case 'report': {
        const reason = stringValue(parsed.reason, 'reason', 30)
        if (!['question', 'connection', 'cheating', 'harassment', 'other'].includes(reason)) throw new Error('Invalid report reason.')
        await repos.combat.reportMatch(
          user.id,
          uuid(parsed.matchId, 'matchId'),
          reason as 'question' | 'connection' | 'cheating' | 'harassment' | 'other',
          typeof parsed.note === 'string' ? parsed.note : undefined,
        )
        return NextResponse.json({ ok: true })
      }
      default:
        throw new Error('Unknown Combat action.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Combat action could not be completed.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
