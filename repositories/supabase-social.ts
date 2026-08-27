import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Friendship, PresenceState, SocialProfile, UUID, UserPrivacy } from '@/types/database'
import type { SocialRepository } from './interfaces'

type Client = SupabaseClient<Database>
type FriendshipRow = Database['public']['Tables']['friendships']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PresenceRow = Database['public']['Tables']['user_presence']['Row']
type PrivacyRow = Database['public']['Tables']['user_privacy']['Row']

const PRESENCE_STATES: readonly PresenceState[] = ['online', 'learning', 'reviewing', 'mock_test', 'in_combat', 'idle', 'offline']

function toPresence(value: string | null | undefined): PresenceState {
  return PRESENCE_STATES.includes(value as PresenceState) ? (value as PresenceState) : 'offline'
}

type SocialProfileRow = Pick<ProfileRow, 'id' | 'display_name' | 'avatar_id' | 'avatar_url'>

function toSocialProfile(profile: SocialProfileRow, presence?: PresenceRow | null): SocialProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_id: profile.avatar_id,
    avatar_url: profile.avatar_url,
    presence: toPresence(presence?.state),
    last_seen_at: presence?.last_seen_at ?? null,
  }
}

function toPrivacy(row: PrivacyRow): UserPrivacy {
  return {
    user_id: row.user_id,
    discoverable: row.discoverable,
    friend_challenges_enabled: row.friend_challenges_enabled,
    presence_visible: row.presence_visible,
    updated_at: row.updated_at,
  }
}

export class SupabaseSocialRepository implements SocialRepository {
  constructor(private readonly client: Client) {}

  private async getProfile(userId: UUID): Promise<SocialProfile> {
    const [profileResult, presenceResult] = await Promise.all([
      this.client.from('profiles').select('id, display_name, avatar_id, avatar_url').eq('id', userId).single(),
      this.client.from('user_presence').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (profileResult.error) throw new Error(profileResult.error.message)
    if (presenceResult.error) throw new Error(presenceResult.error.message)
    return toSocialProfile(profileResult.data as SocialProfileRow, presenceResult.data as PresenceRow | null)
  }

  private async getOtherProfile(friendship: FriendshipRow, userId: UUID): Promise<SocialProfile> {
    return this.getProfile(friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id)
  }

  private async toFriendship(row: FriendshipRow, userId: UUID): Promise<Friendship> {
    return {
      ...row,
      status: row.status as Friendship['status'],
      other_user: await this.getOtherProfile(row, userId),
    }
  }

  async getFriends(userId: UUID): Promise<Friendship[]> {
    const result = await this.client
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (result.error) throw new Error(result.error.message)
    return Promise.all((result.data ?? []).map((row) => this.toFriendship(row, userId)))
  }

  async getRequests(userId: UUID): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }> {
    const [incomingResult, outgoingResult] = await Promise.all([
      this.client.from('friendships').select('*').eq('addressee_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
      this.client.from('friendships').select('*').eq('requester_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (incomingResult.error) throw new Error(incomingResult.error.message)
    if (outgoingResult.error) throw new Error(outgoingResult.error.message)
    const [incoming, outgoing] = await Promise.all([
      Promise.all((incomingResult.data ?? []).map((row) => this.toFriendship(row, userId))),
      Promise.all((outgoingResult.data ?? []).map((row) => this.toFriendship(row, userId))),
    ])
    return { incoming, outgoing }
  }

  async searchUsers(userId: UUID, query: string, limit = 12): Promise<SocialProfile[]> {
    const cleaned = query.trim().replace(/[%_]/g, '')
    if (cleaned.length < 2) return []
    const profilesResult = await this.client
      .from('profiles')
      .select('id, display_name, avatar_id, avatar_url')
      .ilike('display_name', `%${cleaned}%`)
      .neq('id', userId)
      .limit(Math.min(Math.max(limit, 1), 30))
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    const ids = (profilesResult.data ?? []).map((profile) => profile.id)
    if (!ids.length) return []
    const [privacyResult, presenceResult, blocksResult] = await Promise.all([
      this.client.from('user_privacy').select('*').in('user_id', ids),
      this.client.from('user_presence').select('*').in('user_id', ids),
      this.client.from('user_blocks').select('blocked_id').eq('blocker_id', userId).in('blocked_id', ids),
    ])
    if (privacyResult.error) throw new Error(privacyResult.error.message)
    if (presenceResult.error) throw new Error(presenceResult.error.message)
    if (blocksResult.error) throw new Error(blocksResult.error.message)
    const discoverable = new Map((privacyResult.data ?? []).map((row) => [row.user_id, row.discoverable]))
    const blocked = new Set((blocksResult.data ?? []).map((row) => row.blocked_id))
    const presence = new Map((presenceResult.data ?? []).map((row) => [row.user_id, row]))
    return (profilesResult.data ?? [])
      .filter((profile) => discoverable.get(profile.id) !== false && !blocked.has(profile.id))
      .map((profile) => toSocialProfile(profile as SocialProfileRow, presence.get(profile.id)))
  }

  async sendFriendRequest(userId: UUID, otherUserId: UUID): Promise<Friendship> {
    if (userId === otherUserId) throw new Error('You cannot add yourself as a friend.')
    const [privacyResult, blockResult, existingResult] = await Promise.all([
      this.client.from('user_privacy').select('*').eq('user_id', otherUserId).maybeSingle(),
      this.client.from('user_blocks').select('blocked_id').eq('blocker_id', otherUserId).eq('blocked_id', userId).maybeSingle(),
      this.client.from('friendships').select('*').or(`and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`).maybeSingle(),
    ])
    if (privacyResult.error) throw new Error(privacyResult.error.message)
    if (blockResult.error) throw new Error(blockResult.error.message)
    if (existingResult.error && existingResult.error.code !== 'PGRST116') throw new Error(existingResult.error.message)
    if (blockResult.data) throw new Error('This user is unavailable for friend requests.')
    if (privacyResult.data?.discoverable === false) throw new Error('This user is not accepting new friend requests.')
    if (existingResult.data?.status === 'accepted') throw new Error('You are already friends.')
    if (existingResult.data?.status === 'pending') throw new Error('A friend request is already pending.')

    let result
    if (existingResult.data) {
      result = await this.client
        .from('friendships')
        .update({ requester_id: userId, addressee_id: otherUserId, status: 'pending', responded_at: null })
        .eq('id', existingResult.data.id)
        .select('*')
        .single()
    } else {
      result = await this.client
        .from('friendships')
        .insert({ requester_id: userId, addressee_id: otherUserId, status: 'pending' })
        .select('*')
        .single()
    }
    if (result.error) throw new Error(result.error.message)
    return this.toFriendship(result.data, userId)
  }

  async respondToFriendRequest(userId: UUID, friendshipId: UUID, response: 'accepted' | 'declined' | 'cancelled'): Promise<void> {
    const current = await this.client.from('friendships').select('*').eq('id', friendshipId).maybeSingle()
    if (current.error) throw new Error(current.error.message)
    if (!current.data) throw new Error('Friend request not found.')
    const canRespond = response === 'cancelled' ? current.data.requester_id === userId : current.data.addressee_id === userId
    if (!canRespond || current.data.status !== 'pending') throw new Error('This friend request is no longer active.')
    const result = await this.client
      .from('friendships')
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('status', 'pending')
    if (result.error) throw new Error(result.error.message)
  }

  async removeFriend(userId: UUID, friendshipId: UUID): Promise<void> {
    const result = await this.client
      .from('friendships')
      .update({ status: 'removed', responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    if (result.error) throw new Error(result.error.message)
  }

  async blockUser(userId: UUID, otherUserId: UUID): Promise<void> {
    const blockResult = await this.client.from('user_blocks').upsert({ blocker_id: userId, blocked_id: otherUserId })
    if (blockResult.error) throw new Error(blockResult.error.message)
    const friendshipResult = await this.client
      .from('friendships')
      .update({ status: 'removed', responded_at: new Date().toISOString() })
      .in('status', ['pending', 'accepted'])
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`)
    if (friendshipResult.error) throw new Error(friendshipResult.error.message)
  }

  async unblockUser(userId: UUID, otherUserId: UUID): Promise<void> {
    const result = await this.client.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_id', otherUserId)
    if (result.error) throw new Error(result.error.message)
  }

  async getPrivacy(userId: UUID): Promise<UserPrivacy> {
    const existing = await this.client.from('user_privacy').select('*').eq('user_id', userId).maybeSingle()
    if (existing.error) throw new Error(existing.error.message)
    if (existing.data) return toPrivacy(existing.data)
    const created = await this.client.from('user_privacy').insert({ user_id: userId }).select('*').single()
    if (created.error) throw new Error(created.error.message)
    return toPrivacy(created.data)
  }

  async updatePrivacy(userId: UUID, patch: Partial<Omit<UserPrivacy, 'user_id' | 'updated_at'>>): Promise<UserPrivacy> {
    const result = await this.client
      .from('user_privacy')
      .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
      .select('*')
      .single()
    if (result.error) throw new Error(result.error.message)
    return toPrivacy(result.data)
  }

  async setPresence(userId: UUID, state: PresenceState): Promise<void> {
    if (!PRESENCE_STATES.includes(state)) throw new Error('Invalid presence state.')
    const result = await this.client
      .from('user_presence')
      .upsert({ user_id: userId, state, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    if (result.error) throw new Error(result.error.message)
  }
}
