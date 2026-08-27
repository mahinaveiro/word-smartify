import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type {
  CombatMatch,
  CombatQuestion,
  CombatResult,
  Friendship,
  SocialProfile,
  UserPrivacy,
} from '@/types/database'

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createBrowserClient().auth.getSession()
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

export interface CombatAnswerResponse {
  next_position: number
  match: CombatMatch
  result: CombatResult | null
}

export interface FriendRequests {
  incoming: Friendship[]
  outgoing: Friendship[]
}

export async function readCombat<T>(params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params)
  const response = await fetch(`/api/combat?${search.toString()}`, { cache: 'no-store', credentials: 'include', headers: await authHeaders() })
  const payload = (await response.json()) as T | { error?: string }
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Combat data could not be loaded.')
  return payload as T
}

export async function postCombat<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/combat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const payload = (await response.json()) as T | { error?: string }
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Combat action could not be completed.')
  return payload as T
}

export async function readSocial<T>(params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params)
  const response = await fetch(`/api/social?${search.toString()}`, { cache: 'no-store', credentials: 'include', headers: await authHeaders() })
  const payload = (await response.json()) as T | { error?: string }
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Social data could not be loaded.')
  return payload as T
}

export async function postSocial<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const payload = (await response.json()) as T | { error?: string }
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Social action could not be completed.')
  return payload as T
}

export async function loadFriends(): Promise<Friendship[]> {
  return readSocial<Friendship[]>({ view: 'friends' })
}

export async function loadRequests(): Promise<FriendRequests> {
  return readSocial<FriendRequests>({ view: 'requests' })
}

export async function loadHistory(): Promise<CombatMatch[]> {
  return readCombat<CombatMatch[]>({ view: 'history' })
}

export async function searchSocialUsers(query: string): Promise<SocialProfile[]> {
  return readSocial<SocialProfile[]>({ view: 'search', q: query })
}

export async function loadPrivacy(): Promise<UserPrivacy> {
  return readSocial<UserPrivacy>({ view: 'privacy' })
}

export async function loadMatch(matchId: string): Promise<CombatMatch> {
  return readCombat<CombatMatch>({ matchId })
}

export async function loadMatchQuestion(matchId: string, position: number): Promise<CombatQuestion | null> {
  return readCombat<CombatQuestion | null>({ view: 'question', matchId, position: String(position) })
}

export async function loadMatchResult(matchId: string): Promise<CombatResult | null> {
  return readCombat<CombatResult | null>({ view: 'result', matchId })
}

export type CombatMessageRecord = { id: string; match_id: string; sender_id: string; message: string; created_at: string }

export async function loadMatchMessages(matchId: string): Promise<CombatMessageRecord[]> {
  return readCombat<CombatMessageRecord[]>({ view: 'messages', matchId })
}
