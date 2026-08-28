import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type {
  CombatAnswer,
  CombatInvite,
  CombatMatch,
  CombatMatchPlayer,
  CombatQuestion,
  CombatReviewQuestion,
  CombatResult,
  CombatPreset,
  CombatQuestionSource,
  CombatQuickMessage,
  PresenceState,
  SocialProfile,
  UUID,
} from '@/types/database'
import type { CombatRepository } from './interfaces'

type Client = SupabaseClient<Database>
type MatchRow = Database['public']['Tables']['combat_matches']['Row']
type PlayerRow = Database['public']['Tables']['combat_match_players']['Row']
type MatchQuestionRow = Database['public']['Tables']['combat_match_questions']['Row']
type InviteRow = Database['public']['Tables']['combat_match_invites']['Row']
type AnswerRow = Database['public']['Tables']['combat_match_answers']['Row']
type MessageRow = Database['public']['Tables']['combat_match_messages']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PresenceRow = Database['public']['Tables']['user_presence']['Row']

type CombatPlayerWithProfile = CombatMatchPlayer

const PRESETS: Record<CombatPreset, { question_count: number; time_limit_seconds: number }> = {
  sprint: { question_count: 5, time_limit_seconds: 15 },
  standard: { question_count: 10, time_limit_seconds: 15 },
  custom: { question_count: 8, time_limit_seconds: 15 },
}

function toPresence(value: string | null | undefined): PresenceState {
  if (value === 'learning' || value === 'reviewing' || value === 'mock_test' || value === 'in_combat' || value === 'idle' || value === 'online') return value
  return 'offline'
}

function toSocialProfile(profile: ProfileRow, presence?: PresenceRow | null): SocialProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_id: profile.avatar_id,
    avatar_url: profile.avatar_url,
    presence: toPresence(presence?.state),
    last_seen_at: presence?.last_seen_at ?? null,
  }
}

function isActiveStatus(status: string): boolean {
  return status === 'waiting' || status === 'ready' || status === 'active'
}

function safeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((option): option is string => typeof option === 'string').slice(0, 6)
}

function toQuestion(row: MatchQuestionRow): CombatQuestion {
  return {
    id: row.id,
    question_id: row.question_id,
    word_id: row.word_id,
    position: row.position,
    question: row.question,
    options: safeOptions(row.options),
  }
}

function toAnswer(row: AnswerRow): CombatAnswer {
  return {
    question_id: row.question_id,
    selected_answer: row.selected_answer,
    is_correct: row.is_correct,
    response_time_ms: row.response_time_ms,
    submitted_at: row.submitted_at,
  }
}

function outcomeForUser(match: MatchRow, userId: UUID, winnerId: UUID | null): CombatResult['outcome'] {
  if (match.status === 'draw') return 'draw'
  if (match.status === 'cancelled') return 'cancelled'
  if (match.status === 'expired') return 'expired'
  if (match.status === 'abandoned') return 'abandoned'
  if (match.status === 'no_contest') return 'no_contest'
  if (winnerId === userId) return 'win'
  return 'loss'
}

function code(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export class SupabaseCombatRepository implements CombatRepository {
  constructor(private readonly client: Client) {}

  private async assertParticipant(matchId: UUID, userId: UUID): Promise<MatchRow> {
    const result = await this.client.from('combat_matches').select('*').eq('id', matchId).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    if (!result.data || (result.data.host_id !== userId && result.data.opponent_id !== userId)) {
      throw new Error('Match not found.')
    }
    return result.data
  }

  private async profilesFor(userIds: UUID[]): Promise<Map<UUID, SocialProfile>> {
    if (!userIds.length) return new Map()
    const [profilesResult, presenceResult] = await Promise.all([
      this.client.from('profiles').select('id, display_name, avatar_id, avatar_url').in('id', userIds),
      this.client.from('user_presence').select('*').in('user_id', userIds),
    ])
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    if (presenceResult.error) throw new Error(presenceResult.error.message)
    const presence = new Map((presenceResult.data ?? []).map((row) => [row.user_id, row as PresenceRow]))
    return new Map((profilesResult.data ?? []).map((row) => [row.id, toSocialProfile(row as ProfileRow, presence.get(row.id))]))
  }

  private async hydrateMatch(row: MatchRow): Promise<CombatMatch> {
    const playersResult = await this.client.from('combat_match_players').select('*').eq('match_id', row.id).order('slot', { ascending: true })
    if (playersResult.error) throw new Error(playersResult.error.message)
    const playerRows = (playersResult.data ?? []) as PlayerRow[]
    const profiles = await this.profilesFor(playerRows.map((player) => player.user_id))
    const currentQuestionResult = row.status === 'active'
      ? await this.client.from('combat_match_questions').select('question_id').eq('match_id', row.id).eq('position', row.current_question_index).maybeSingle()
      : null
    if (currentQuestionResult?.error) throw new Error(currentQuestionResult.error.message)
    const currentQuestionId = currentQuestionResult?.data?.question_id
    const submissionsResult = currentQuestionId
      ? await this.client.from('combat_match_answers').select('user_id').eq('match_id', row.id).eq('question_id', currentQuestionId)
      : null
    if (submissionsResult?.error) throw new Error(submissionsResult.error.message)
    const currentQuestionSubmissions = submissionsResult?.data?.map((answer) => answer.user_id) ?? []
    const players: CombatPlayerWithProfile[] = playerRows.map((player) => ({
      ...player,
      slot: player.slot as 1 | 2,
      profile: profiles.get(player.user_id) ?? {
        id: player.user_id,
        display_name: 'Player',
        avatar_id: 'default',
        avatar_url: null,
        presence: 'offline',
        last_seen_at: null,
      },
    }))
    return { ...row, preset: row.preset as CombatPreset, status: row.status as CombatMatch['status'], visibility: 'private', question_source: (row.question_source ? (row.question_source as unknown as CombatQuestionSource) : { mode: 'mixed' }), wager_xp: row.wager_xp === 100 ? 100 : 0, wager_status: row.wager_status as CombatMatch['wager_status'], current_question_submissions: currentQuestionSubmissions, players }
  }

  private async uniqueJoinCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = code()
      const result = await this.client.from('combat_matches').select('id').eq('join_code', candidate).maybeSingle()
      if (result.error) throw new Error(result.error.message)
      if (!result.data) return candidate
    }
    throw new Error('Could not reserve a match code. Please try again.')
  }

  private async reserveWager(matchId: UUID, userId: UUID): Promise<MatchRow> {
    const result = await this.client.rpc('reserve_combat_wager', { p_match_id: matchId, p_user_id: userId })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The XP wager could not be reserved.')
    return result.data as MatchRow
  }

  private async settleWager(matchId: UUID, winnerId: UUID | null): Promise<void> {
    const result = await this.client.rpc('settle_combat_wager', { p_match_id: matchId, p_winner_id: winnerId ?? undefined })
    if (result.error) throw new Error(result.error.message)
  }

  private wagerDeltas(match: MatchRow, currentUserId: UUID): { my_xp_delta: number; opponent_xp_delta: number } {
    if (match.wager_xp === 0 || match.wager_status !== 'settled' || !match.wager_winner_id) return { my_xp_delta: 0, opponent_xp_delta: 0 }
    return match.wager_winner_id === currentUserId ? { my_xp_delta: match.wager_xp, opponent_xp_delta: -match.wager_xp } : { my_xp_delta: -match.wager_xp, opponent_xp_delta: match.wager_xp }
  }

  private async chooseQuestions(count: number, source: CombatQuestionSource = { mode: 'mixed' }, userIds: UUID[] = []): Promise<Array<{ question_id: UUID; word_id: UUID; question: string; options: string[]; correct_answer: string; explanation: string | null }>> {
    let wordIds: string[] | null = null
    if (source.mode === 'letter') {
      const words = await this.client.from('words').select('id').ilike('word', `${source.letter ?? 'A'}%`).limit(1200)
      if (words.error) throw new Error(words.error.message)
      wordIds = (words.data ?? []).map((row) => row.id)
    } else if (source.mode === 'level' || source.mode === 'book') {
      let levelQuery = this.client.from('levels').select('id, chapter_id')
      if (source.mode === 'level') levelQuery = levelQuery.gte('level_number', source.level_from ?? 1).lte('level_number', source.level_to ?? source.level_from ?? 1)
      const levels = await levelQuery.limit(500)
      if (levels.error) throw new Error(levels.error.message)
      let levelRows = levels.data ?? []
      if (source.mode === 'book') {
        if (!source.book_id) throw new Error('Choose a book for this match.')
        const chapters = await this.client.from('chapters').select('id').eq('book_id', source.book_id).limit(200)
        if (chapters.error) throw new Error(chapters.error.message)
        const chapterIds = new Set((chapters.data ?? []).map((row) => row.id))
        levelRows = levelRows.filter((row) => chapterIds.has(row.chapter_id))
      }
      const levelIds = levelRows.map((row) => row.id)
      const words = levelIds.length ? await this.client.from('words').select('id').in('level_id', levelIds).limit(1600) : { data: [], error: null }
      if (words.error) throw new Error(words.error.message)
      wordIds = (words.data ?? []).map((row) => row.id)
    } else if (source.mode === 'smart' && userIds.length >= 2) {
      const progress = await this.client.from('user_word_progress').select('user_id, word_id, status').in('user_id', userIds).in('status', ['learned', 'mastered']).limit(5000)
      if (progress.error) throw new Error(progress.error.message)
      const byUser = new Map<UUID, Set<UUID>>()
      for (const row of progress.data ?? []) {
        const set = byUser.get(row.user_id) ?? new Set<UUID>()
        set.add(row.word_id)
        byUser.set(row.user_id, set)
      }
      const first = byUser.get(userIds[0]) ?? new Set<UUID>()
      const second = byUser.get(userIds[1]) ?? new Set<UUID>()
      wordIds = [...first].filter((id) => second.has(id))
    }
    if (wordIds && wordIds.length < 3) throw new Error('There are not enough shared words for that source.')
    let query = this.client
      .from('quiz_questions')
      .select('id, word_id, question, options, correct_answer, explanation, question_type')
      .not('options', 'is', null)
      .in('question_type', ['meaning', 'synonym', 'antonym', 'context', 'bangla', 'usage', 'fill_blank'])
    if (wordIds) query = query.in('word_id', wordIds)
    const result = await query.limit(600)
    if (result.error) throw new Error(result.error.message)
    const usable = (result.data ?? [])
      .map((row) => ({
        question_id: row.id,
        word_id: row.word_id,
        question: row.question,
        options: safeOptions(row.options),
        correct_answer: row.correct_answer,
        explanation: row.explanation,
      }))
      .filter((row) => row.options.length >= 3 && row.options.includes(row.correct_answer))
    if (usable.length < count) throw new Error('There are not enough valid questions for this match yet.')
    const shuffled = [...usable].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  async getMatch(matchId: UUID, userId: UUID): Promise<CombatMatch | null> {
    let row = await this.assertParticipant(matchId, userId)
    if (row.status === 'waiting' && new Date(row.expires_at).getTime() <= Date.now()) {
      await this.client.from('combat_matches').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', matchId).eq('status', 'waiting')
      row.status = 'expired'
      if (row.wager_xp > 0 && !['settled', 'refunded'].includes(row.wager_status)) {
        await this.settleWager(matchId, null)
        const refunded = await this.client.from('combat_matches').select('*').eq('id', matchId).single()
        if (refunded.error) throw new Error(refunded.error.message)
        row = refunded.data
      }
    }
    return this.hydrateMatch(row)
  }

  async getMatchByCode(codeValue: string, userId: UUID): Promise<CombatMatch | null> {
    const normalized = codeValue.trim().toUpperCase()
    const result = await this.client.from('combat_matches').select('*').eq('join_code', normalized).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    if (!result.data || result.data.host_id !== userId && result.data.opponent_id !== userId) return null
    if (result.data.status === 'waiting' && new Date(result.data.expires_at).getTime() <= Date.now()) {
      await this.client.from('combat_matches').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', result.data.id).eq('status', 'waiting')
      if (result.data.wager_xp > 0 && !['settled', 'refunded'].includes(result.data.wager_status)) await this.settleWager(result.data.id, null)
      const expired = await this.client.from('combat_matches').select('*').eq('id', result.data.id).single()
      if (expired.error) throw new Error(expired.error.message)
      return this.hydrateMatch(expired.data)
    }
    return this.hydrateMatch(result.data)
  }

  async getHistory(userId: UUID, limit = 20): Promise<CombatMatch[]> {
    const result = await this.client
      .from('combat_matches')
      .select('*')
      .or(`host_id.eq.${userId},opponent_id.eq.${userId}`)
      .not('status', 'in', '(waiting,ready)')
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50))
    if (result.error) throw new Error(result.error.message)
    return Promise.all((result.data ?? []).map((row) => this.hydrateMatch(row)))
  }

  async getInvites(userId: UUID): Promise<CombatInvite[]> {
    const result = await this.client
      .from('combat_match_invites')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    if (result.error) throw new Error(result.error.message)
    const rows = (result.data ?? []) as InviteRow[]
    const now = new Date()
    const nowIso = now.toISOString()
    const matchRows = await Promise.all(rows.map(async (row) => {
      const match = await this.client.from('combat_matches').select('*').eq('id', row.match_id).maybeSingle()
      if (match.error) throw new Error(match.error.message)
      return { invite: row, match: match.data as MatchRow | null }
    }))
    const activeRows: Array<{ invite: InviteRow; match: MatchRow }> = []
    for (const { invite, match } of matchRows) {
      const matchExpired = Boolean(match && match.status === 'waiting' && new Date(match.expires_at).getTime() <= now.getTime())
      const inviteDead = !match || match.status !== 'waiting' || Boolean(match.opponent_id) || matchExpired
      if (!inviteDead && match) {
        activeRows.push({ invite, match })
        continue
      }
      const expiredInvite = await this.client
        .from('combat_match_invites')
        .update({ status: 'expired', responded_at: nowIso })
        .eq('id', invite.id)
        .eq('status', 'pending')
      if (expiredInvite.error) throw new Error(expiredInvite.error.message)
      if (matchExpired && match) {
        const expiredMatch = await this.client
          .from('combat_matches')
          .update({ status: 'expired', updated_at: nowIso })
          .eq('id', match.id)
          .eq('status', 'waiting')
          .select('id')
          .maybeSingle()
        if (expiredMatch.error) throw new Error(expiredMatch.error.message)
        if (expiredMatch.data && match.wager_xp > 0 && !['settled', 'refunded'].includes(match.wager_status)) await this.settleWager(match.id, null)
      }
    }
    const profiles = await this.profilesFor(activeRows.map(({ invite }) => invite.sender_id))
    const hydratedMatches = await Promise.all(activeRows.map(async ({ invite, match }) => [invite.match_id, await this.hydrateMatch(match)] as const))
    const matchMap = new Map(hydratedMatches)
    return activeRows.map(({ invite }) => ({
      ...invite,
      status: invite.status as CombatInvite['status'],
      sender: profiles.get(invite.sender_id) as SocialProfile,
      match: matchMap.get(invite.match_id) ?? null,
    }))
  }

  async inviteFriend(userId: UUID, matchId: UUID, recipientId: UUID): Promise<CombatInvite> {
    if (userId === recipientId) throw new Error('You cannot challenge yourself.')
    const match = await this.assertParticipant(matchId, userId)
    if (match.host_id !== userId || match.status !== 'waiting' || match.opponent_id) throw new Error('This private match is no longer available for an invite.')
    const [friendshipResult, blockResult, privacyResult] = await Promise.all([
      this.client.from('friendships').select('id').eq('status', 'accepted').or(`and(requester_id.eq.${userId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${userId})`).maybeSingle(),
      this.client.from('user_blocks').select('blocker_id').or(`and(blocker_id.eq.${userId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${userId})`).maybeSingle(),
      this.client.from('user_privacy').select('friend_challenges_enabled').eq('user_id', recipientId).maybeSingle(),
    ])
    if (friendshipResult.error) throw new Error(friendshipResult.error.message)
    if (blockResult.error) throw new Error(blockResult.error.message)
    if (privacyResult.error) throw new Error(privacyResult.error.message)
    if (!friendshipResult.data) throw new Error('You can challenge friends only.')
    if (blockResult.data) throw new Error('This player is unavailable for challenges.')
    if (privacyResult.data?.friend_challenges_enabled === false) throw new Error('This player is not accepting challenges right now.')
    const existing = await this.client.from('combat_match_invites').select('*').eq('match_id', matchId).eq('recipient_id', recipientId).maybeSingle()
    if (existing.error) throw new Error(existing.error.message)
    let result
    if (existing.data && existing.data.status === 'pending') result = { data: existing.data, error: null }
    else if (existing.data) result = await this.client.from('combat_match_invites').update({ sender_id: userId, status: 'pending', responded_at: null }).eq('id', existing.data.id).select('*').single()
    else result = await this.client.from('combat_match_invites').insert({ match_id: matchId, sender_id: userId, recipient_id: recipientId }).select('*').single()
    if (result.error) throw new Error(result.error.message)
    const profiles = await this.profilesFor([userId])
    return {
      ...(result.data as InviteRow),
      status: (result.data as InviteRow).status as CombatInvite['status'],
      sender: profiles.get(userId) as SocialProfile,
      match: await this.hydrateMatch(match),
    }
  }

  async respondToInvite(userId: UUID, inviteId: UUID, response: 'accepted' | 'declined'): Promise<CombatMatch | null> {
    const result = await this.client.rpc('respond_combat_invite', {
      p_invite_id: inviteId,
      p_user_id: userId,
      p_response: response,
    })
    if (result.error) throw new Error(result.error.message)
    const matchRow = result.data as MatchRow | null
    if (!matchRow) throw new Error('The invitation could not be processed.')
    if (response === 'declined') return null
    if (matchRow.status === 'expired') throw new Error('This challenge has expired.')
    if (matchRow.status !== 'waiting') throw new Error('This challenge is no longer active.')
    return this.hydrateMatch(matchRow)
  }

  async createMatch(userId: UUID, input: { preset: CombatPreset; question_count: number; time_limit_seconds: number; wager_xp?: 0 | 100; question_source?: CombatQuestionSource }): Promise<CombatMatch> {
    const preset = input.preset in PRESETS ? input.preset : 'sprint'
    const defaults = PRESETS[preset]
    const questionCount = preset === 'custom' && Number.isInteger(input.question_count) ? input.question_count : defaults.question_count
    const timeLimit = Number.isInteger(input.time_limit_seconds) ? input.time_limit_seconds : defaults.time_limit_seconds
    const wagerXp: 0 | 100 = input.wager_xp === 100 ? 100 : 0
    const questionSource = input.question_source ?? { mode: 'mixed' as const }
    if (questionCount < 3 || questionCount > 20) throw new Error('Choose between 3 and 20 questions.')
    if (timeLimit < 5 || timeLimit > 60) throw new Error('Choose a response time between 5 and 60 seconds.')
    const questions = await this.chooseQuestions(questionCount, questionSource, [userId])
    const matchInsert = await this.client
      .from('combat_matches')
      .insert({
        host_id: userId,
        join_code: await this.uniqueJoinCode(),
        preset,
        question_count: questionCount,
        time_limit_seconds: timeLimit,
        wager_xp: wagerXp,
        wager_status: wagerXp > 0 ? 'pending' : 'none',
        question_source: questionSource as unknown as Database['public']['Tables']['combat_matches']['Insert']['question_source'],
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single()
    if (matchInsert.error) {
      if (/question_source|column .* does not exist/i.test(matchInsert.error.message)) {
        throw new Error('Combat source selection needs the latest database migration before a match can be created.')
      }
      throw new Error(matchInsert.error.message)
    }
    const playerInsert = await this.client.from('combat_match_players').insert({ match_id: matchInsert.data.id, user_id: userId, slot: 1 })
    if (playerInsert.error) {
      await this.client.from('combat_matches').delete().eq('id', matchInsert.data.id)
      throw new Error(playerInsert.error.message)
    }
    const questionInsert = await this.client.from('combat_match_questions').insert(
      questions.map((question, position) => ({ match_id: matchInsert.data.id, position, ...question, options: question.options })),
    )
    if (questionInsert.error) {
      await this.client.from('combat_matches').delete().eq('id', matchInsert.data.id)
      throw new Error(questionInsert.error.message)
    }
    try {
      const reserved = await this.reserveWager(matchInsert.data.id, userId)
      return this.hydrateMatch(reserved)
    } catch (error) {
      await this.client.from('combat_matches').delete().eq('id', matchInsert.data.id)
      throw error
    }
  }

  async joinMatch(userId: UUID, joinCode: string): Promise<CombatMatch> {
    const normalized = joinCode.trim().toUpperCase()
    const matchResult = await this.client.from('combat_matches').select('*').eq('join_code', normalized).maybeSingle()
    if (matchResult.error) throw new Error(matchResult.error.message)
    if (!matchResult.data) throw new Error('That match code is not active.')
    const match = matchResult.data
    if (match.host_id === userId) return this.hydrateMatch(match)
    if (match.status !== 'waiting' || match.opponent_id || new Date(match.expires_at).getTime() <= Date.now()) throw new Error('That match is no longer accepting a player.')
    const block = await this.client.from('user_blocks').select('blocker_id').or(`and(blocker_id.eq.${userId},blocked_id.eq.${match.host_id}),and(blocker_id.eq.${match.host_id},blocked_id.eq.${userId})`).maybeSingle()
    if (block.error) throw new Error(block.error.message)
    if (block.data) throw new Error('You cannot join this match.')
    if (match.wager_xp === 100) {
      const friendship = await this.client.from('friendships').select('id').eq('status', 'accepted').or(`and(requester_id.eq.${userId},addressee_id.eq.${match.host_id}),and(requester_id.eq.${match.host_id},addressee_id.eq.${userId})`).maybeSingle()
      if (friendship.error) throw new Error(friendship.error.message)
      if (!friendship.data) throw new Error('XP-wagered matches are available to friends only.')
    }
    const joined = await this.client.rpc('join_combat_match', { p_match_id: match.id, p_user_id: userId })
    if (joined.error) throw new Error(joined.error.message)
    if (!joined.data) throw new Error('That match could not be joined.')
    return this.hydrateMatch(joined.data as MatchRow)
  }

  async setReady(userId: UUID, matchId: UUID, ready: boolean): Promise<CombatMatch> {
    const result = await this.client.rpc('set_combat_ready', {
      p_match_id: matchId,
      p_user_id: userId,
      p_ready: ready,
    })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The readiness change could not be synchronized.')
    return this.hydrateMatch(result.data as MatchRow)
  }

  async startMatch(userId: UUID, matchId: UUID): Promise<CombatMatch> {
    const match = await this.assertParticipant(matchId, userId)
    if (match.status !== 'ready') throw new Error('Both players must be ready before the match starts.')
    if (match.wager_xp > 0 && match.wager_status !== 'reserved') throw new Error('Both XP stakes must be reserved before the match starts.')
    const players = await this.client.from('combat_match_players').select('user_id, is_ready, slot').eq('match_id', matchId).order('slot', { ascending: true })
    if (players.error) throw new Error(players.error.message)
    if ((players.data ?? []).length !== 2 || !(players.data ?? []).every((player) => player.is_ready)) throw new Error('Both players must be ready before the match starts.')
    const playerRows = players.data ?? []
    const questionSource = (match.question_source as unknown as CombatQuestionSource | null) ?? { mode: 'mixed' as const }
    const smartQuestions = questionSource.mode === 'smart'
      ? await this.chooseQuestions(match.question_count, questionSource, playerRows.map((player) => player.user_id))
      : null
    const result = await this.client.rpc('start_combat_match', {
      p_match_id: matchId,
      p_user_id: userId,
      p_questions: smartQuestions ? smartQuestions.map((question) => ({ ...question, options: question.options })) : null,
    })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The match could not be started.')
    await this.client.from('user_presence').upsert({ user_id: match.host_id, state: 'in_combat', last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    if (match.opponent_id) await this.client.from('user_presence').upsert({ user_id: match.opponent_id, state: 'in_combat', last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return this.hydrateMatch(result.data)
  }

  async getQuestion(userId: UUID, matchId: UUID, position: number): Promise<CombatQuestion | null> {
    const match = await this.assertParticipant(matchId, userId)
    if (match.status !== 'active') return null
    if (!Number.isInteger(position) || position !== match.current_question_index) return null
    const result = await this.client.from('combat_match_questions').select('*').eq('match_id', matchId).eq('position', position).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data ? toQuestion(result.data) : null
  }

  private async buildResult(match: MatchRow, currentUserId: UUID, finalize: boolean): Promise<CombatResult | null> {
    const questionCount = match.question_count
    const questions = await this.client.from('combat_match_questions').select('*').eq('match_id', match.id).order('position', { ascending: true })
    const answers = await this.client.from('combat_match_answers').select('*').eq('match_id', match.id)
    const players = await this.client.from('combat_match_players').select('*').eq('match_id', match.id).order('slot', { ascending: true })
    if (questions.error) throw new Error(questions.error.message)
    if (answers.error) throw new Error(answers.error.message)
    if (players.error) throw new Error(players.error.message)
    const playerRows = (players.data ?? []) as PlayerRow[]
    if (playerRows.length !== 2) return null
    const scoreByUser = new Map<UUID, { correct: number; answered: number; total: number }>()
    for (const player of playerRows) scoreByUser.set(player.user_id, { correct: 0, answered: 0, total: 0 })
    for (const answer of (answers.data ?? []) as AnswerRow[]) {
      const score = scoreByUser.get(answer.user_id)
      if (!score) continue
      score.answered += 1
      score.total += answer.response_time_ms
      if (answer.is_correct) score.correct += 1
    }
    for (const player of playerRows) {
      const score = scoreByUser.get(player.user_id)
      if (!score) continue
      if (finalize) await this.client.from('combat_match_players').update({ correct_count: score.correct, answered_count: score.answered, total_time_ms: score.total, last_seen_at: new Date().toISOString() }).eq('id', player.id)
    }
    if (match.status === 'active' && match.current_question_index + 1 < questionCount) return null
    const first = scoreByUser.get(playerRows[0].user_id) as { correct: number; answered: number; total: number }
    const second = scoreByUser.get(playerRows[1].user_id) as { correct: number; answered: number; total: number }
    const winnerId = match.winner_id
    const status = winnerId ? 'completed' : 'draw'
    let finalData = match
    if (finalize) {
      const final = await this.client.from('combat_matches').update({ status, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', match.id).in('status', ['active']).select('*').maybeSingle()
      if (final.error) throw new Error(final.error.message)
      if (final.data) finalData = final.data
      else {
        const fresh = await this.client.from('combat_matches').select('*').eq('id', match.id).single()
        if (fresh.error) throw new Error(fresh.error.message)
        finalData = fresh.data
      }
    }
    const wagerNeedsSettlement = finalData.wager_xp > 0 && !['settled', 'refunded'].includes(finalData.wager_status)
    if (!isActiveStatus(finalData.status) && wagerNeedsSettlement) {
      await this.settleWager(finalData.id, winnerId)
      const settled = await this.client.from('combat_matches').select('*').eq('id', finalData.id).single()
      if (settled.error) throw new Error(settled.error.message)
      finalData = settled.data
    }
    const profiles = await this.profilesFor(playerRows.map((player) => player.user_id))
    const hydratedPlayers: CombatMatchPlayer[] = playerRows.map((player) => ({
      ...player,
      slot: player.slot as 1 | 2,
      profile: profiles.get(player.user_id) as SocialProfile,
    }))
    const hydratedMatch: CombatMatch = { ...finalData, preset: finalData.preset as CombatPreset, status: finalData.status as CombatMatch['status'], visibility: 'private', question_source: (finalData.question_source as unknown as CombatQuestionSource) ?? { mode: 'mixed' }, wager_xp: finalData.wager_xp === 100 ? 100 : 0, wager_status: finalData.wager_status as CombatMatch['wager_status'], players: hydratedPlayers }
    const questionRows = (questions.data ?? []) as MatchQuestionRow[]
    const answerRows = (answers.data ?? []) as AnswerRow[]
    const currentUser = currentUserId
    const opponent = playerRows.find((player) => player.user_id !== currentUserId)
    if (!opponent) return null
    const currentScore = scoreByUser.get(currentUser) as { correct: number; answered: number; total: number }
    const otherScore = scoreByUser.get(opponent.user_id) as { correct: number; answered: number; total: number }
    const deltas = this.wagerDeltas(finalData, currentUserId)
    return {
      match: hydratedMatch,
      outcome: outcomeForUser(finalData, currentUser, winnerId),
      winner_id: winnerId,
      my_score: currentScore.correct,
      opponent_score: otherScore.correct,
      my_accuracy: currentScore.answered ? Math.round((currentScore.correct / currentScore.answered) * 100) : 0,
      opponent_accuracy: otherScore.answered ? Math.round((otherScore.correct / otherScore.answered) * 100) : 0,
      my_total_time_ms: currentScore.total,
      opponent_total_time_ms: otherScore.total,
      my_answers: answerRows.filter((answer) => answer.user_id === currentUser).map(toAnswer),
      opponent_answers: answerRows.filter((answer) => answer.user_id === opponent.user_id).map(toAnswer),
      wager_xp: finalData.wager_xp as 0 | 100,
      wager_status: finalData.wager_status as CombatResult['wager_status'],
      my_xp_delta: deltas.my_xp_delta,
      opponent_xp_delta: deltas.opponent_xp_delta,
      missed_questions: questionRows
        .filter((question) => answerRows.some((answer) => answer.user_id === currentUser && answer.question_id === question.question_id && !answer.is_correct))
        .map((question) => ({
          ...toQuestion(question),
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          selected_answer: answerRows.find((answer) => answer.user_id === currentUser && answer.question_id === question.question_id)?.selected_answer ?? null,
        } satisfies CombatReviewQuestion)),
    }
  }

  async submitAnswer(userId: UUID, matchId: UUID, questionId: UUID, selectedAnswer: string | null, responseTimeMs: number): Promise<{ next_position: number; match: CombatMatch; result: CombatResult | null }> {
    const result = await this.client.rpc('submit_combat_answer', {
      p_match_id: matchId,
      p_user_id: userId,
      p_question_id: questionId,
      p_selected_answer: selectedAnswer,
      p_response_time_ms: Number.isFinite(responseTimeMs) ? Math.max(0, Math.round(responseTimeMs)) : 0,
    })
    if (result.error) throw new Error(result.error.message)
    const payload = result.data as { next_position?: number; match?: MatchRow } | null
    if (!payload?.match) throw new Error('The answer could not be synchronized.')
    const hydratedMatch = await this.hydrateMatch(payload.match)
    const finalResult = isActiveStatus(payload.match.status) ? null : await this.buildResult(payload.match, userId, false)
    return {
      next_position: typeof payload.next_position === 'number' ? payload.next_position : hydratedMatch.current_question_index,
      match: hydratedMatch,
      result: finalResult,
    }
  }

  async heartbeat(userId: UUID, matchId: UUID): Promise<CombatMatch> {
    const result = await this.client.rpc('heartbeat_combat_match', { p_match_id: matchId, p_user_id: userId })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The match heartbeat could not be synchronized.')
    return this.hydrateMatch(result.data as MatchRow)
  }

  async leaveMatch(userId: UUID, matchId: UUID): Promise<CombatMatch> {
    const result = await this.client.rpc('leave_combat_match', { p_match_id: matchId, p_user_id: userId })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The match departure could not be synchronized.')
    return this.hydrateMatch(result.data as MatchRow)
  }

  async forfeitMatch(userId: UUID, matchId: UUID): Promise<CombatMatch> {
    const result = await this.client.rpc('forfeit_combat_match', { p_match_id: matchId, p_user_id: userId })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The match forfeiture could not be synchronized.')
    return this.hydrateMatch(result.data as MatchRow)
  }

  async sendQuickMessage(userId: UUID, matchId: UUID, message: CombatQuickMessage): Promise<{ id: UUID; match_id: UUID; sender_id: UUID; message: CombatQuickMessage; created_at: string }> {
    const result = await this.client.rpc('send_combat_message', { p_match_id: matchId, p_sender_id: userId, p_message: message })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The quick message could not be sent.')
    const row = result.data as MessageRow
    return { id: row.id, match_id: row.match_id, sender_id: row.sender_id, message: row.message as CombatQuickMessage, created_at: row.created_at }
  }

  async getMessages(userId: UUID, matchId: UUID): Promise<Array<{ id: UUID; match_id: UUID; sender_id: UUID; message: CombatQuickMessage; created_at: string }>> {
    await this.assertParticipant(matchId, userId)
    const result = await this.client.from('combat_match_messages').select('id, match_id, sender_id, message, created_at').eq('match_id', matchId).order('created_at', { ascending: false }).limit(20)
    if (result.error) throw new Error(result.error.message)
    return ((result.data ?? []) as MessageRow[]).reverse().map((row) => ({ id: row.id, match_id: row.match_id, sender_id: row.sender_id, message: row.message as CombatQuickMessage, created_at: row.created_at }))
  }

  async getResult(userId: UUID, matchId: UUID): Promise<CombatResult | null> {
    const match = await this.assertParticipant(matchId, userId)
    if (isActiveStatus(match.status)) return null
    return this.buildResult(match, userId, false)
  }

  async cancelMatch(userId: UUID, matchId: UUID): Promise<void> {
    const result = await this.client.rpc('cancel_combat_match', { p_match_id: matchId, p_user_id: userId })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('The match cancellation could not be synchronized.')
  }

  async reportMatch(userId: UUID, matchId: UUID, reason: 'question' | 'connection' | 'cheating' | 'harassment' | 'other', note?: string): Promise<void> {
    await this.assertParticipant(matchId, userId)
    const result = await this.client.from('combat_match_reports').insert({ match_id: matchId, reporter_id: userId, reason, note: note?.trim().slice(0, 500) || null })
    if (result.error) throw new Error(result.error.message)
  }
}
