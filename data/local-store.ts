/**
 * Local persistence backing for the repository layer.
 *
 * This is the ONLY place that touches a concrete storage mechanism. It is an
 * implementation detail of the local repositories and is never imported by UI
 * components. When the Supabase-backed repositories replace the local ones,
 * this file is simply dropped.
 *
 * Storage: localStorage in the browser, with an in-memory fallback during SSR
 * so repository calls never throw on the server.
 */

import type {
  DailyProgress,
  MockTest,
  MockTestAnswer,
  Profile,
  UserStats,
  UserWordProgress,
} from '@/types/database'

/** The single local dev user. Real auth (Supabase) will supply this later. */
export const CURRENT_USER_ID = 'local-user-0001'

export interface UserDataShape {
  profiles: Record<string, Profile>
  stats: Record<string, UserStats>
  wordProgress: Record<string, UserWordProgress> // key: `${userId}:${wordId}`
  dailyProgress: Record<string, DailyProgress> // key: `${userId}:${date}`
  mockTests: Record<string, MockTest>
  mockAnswers: Record<string, MockTestAnswer[]> // key: testId
  demoLeaderboard: Array<{ profile: Profile; stats: UserStats }>
}

const STORAGE_KEY = 'word-smartify:v1'

let memory: UserDataShape | null = null

function emptyShape(): UserDataShape {
  return {
    profiles: {},
    stats: {},
    wordProgress: {},
    dailyProgress: {},
    mockTests: {},
    mockAnswers: {},
    demoLeaderboard: [],
  }
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function load(): UserDataShape {
  if (memory) return memory
  if (hasWindow()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        memory = JSON.parse(raw) as UserDataShape
        return memory
      }
    } catch {
      // corrupt storage — start fresh
    }
  }
  memory = emptyShape()
  return memory
}

function persist(data: UserDataShape) {
  memory = data
  if (hasWindow()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // quota / private mode — memory copy still valid for the session
    }
  }
}

export function readStore(): UserDataShape {
  return load()
}

export function writeStore(mutator: (draft: UserDataShape) => void): UserDataShape {
  const data = load()
  mutator(data)
  persist(data)
  return data
}

export function progressKey(userId: string, wordId: string) {
  return `${userId}:${wordId}`
}

export function dailyKey(userId: string, date: string) {
  return `${userId}:${date}`
}
