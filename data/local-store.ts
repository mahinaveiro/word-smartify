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
  BookProgressSummary,
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
  demoBookProgress: Record<string, BookProgressSummary[]>
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
    demoBookProgress: {},
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
        const parsed = JSON.parse(raw) as Partial<UserDataShape>
        memory = {
          ...emptyShape(),
          ...parsed,
          demoBookProgress: parsed.demoBookProgress ?? {},
        }
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

/**
 * The active (signed-in) user id. Defaults to the seeded demo user so the app
 * is populated before any auth happens and during SSR. The local AuthService
 * updates this pointer on sign-in / sign-out. When Supabase auth lands, the
 * session user id replaces this — the repositories keep reading it the same way.
 */
const ACTIVE_USER_KEY = 'word-smartify:active-user'
let activeUserId: string | null = null

export function getActiveUserId(): string {
  if (activeUserId) return activeUserId
  if (hasWindow()) {
    try {
      const v = window.localStorage.getItem(ACTIVE_USER_KEY)
      if (v) {
        activeUserId = v
        return v
      }
    } catch {
      // ignore
    }
  }
  return CURRENT_USER_ID
}

export function setActiveUserId(id: string) {
  activeUserId = id
  if (hasWindow()) {
    try {
      window.localStorage.setItem(ACTIVE_USER_KEY, id)
    } catch {
      // ignore
    }
  }
}

export function clearActiveUserId() {
  activeUserId = null
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(ACTIVE_USER_KEY)
    } catch {
      // ignore
    }
  }
}

export function deleteUserData(userId: string) {
  writeStore((draft) => {
    delete draft.profiles[userId]
    delete draft.stats[userId]
    delete draft.demoBookProgress[userId]
    for (const [key, row] of Object.entries(draft.wordProgress)) {
      if (row.user_id === userId) delete draft.wordProgress[key]
    }
    for (const [key, row] of Object.entries(draft.dailyProgress)) {
      if (row.user_id === userId) delete draft.dailyProgress[key]
    }
    const testIds = Object.values(draft.mockTests)
      .filter((test) => test.user_id === userId)
      .map((test) => test.id)
    for (const testId of testIds) {
      delete draft.mockTests[testId]
      delete draft.mockAnswers[testId]
    }
  })
}

export function progressKey(userId: string, wordId: string) {
  return `${userId}:${wordId}`
}

export function dailyKey(userId: string, date: string) {
  return `${userId}:${date}`
}
