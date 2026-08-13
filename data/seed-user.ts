/**
 * Seeds realistic starting user data for the local dev user + a derived
 * leaderboard of demo learners. Runs once (guarded) the first time any user
 * repository reads the store.
 */

import type {
  DailyProgress,
  Profile,
  UserStats,
  UserWordProgress,
  WordStatus,
} from '@/types/database'
import { getDataset } from './dataset'
import { makeId, makeRng, NOW } from './seed-utils'
import {
  CURRENT_USER_ID,
  dailyKey,
  progressKey,
  readStore,
  writeStore,
  type UserDataShape,
} from './local-store'

const DEMO_NAMES = [
  'Anika Rahman',
  'Tanvir Ahmed',
  'Priya Sharma',
  'Marcus Lee',
  'Sofia Alvarez',
  'Hana Kim',
  'Diego Torres',
  'Yusuf Karim',
  'Elena Petrova',
  'Nadia Islam',
]

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function dateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function ensureSeeded() {
  const store = readStore()
  if (store.profiles[CURRENT_USER_ID]) return

  writeStore((draft) => {
    seedCurrentUser(draft)
    seedLeaderboard(draft)
  })
}

function seedCurrentUser(draft: UserDataShape) {
  const ds = getDataset()
  const firstBook = ds.books[0]

  const profile: Profile = {
    id: CURRENT_USER_ID,
    display_name: 'Marisol',
    avatar_id: 'coral',
    daily_goal: 10,
    current_book_id: firstBook.id,
    created_at: isoDaysAgo(40),
    updated_at: NOW,
  }
  draft.profiles[CURRENT_USER_ID] = profile

  // Seed word progress across the first ~140 words with varied statuses.
  const rng = makeRng(42)
  let learned = 0
  let mastered = 0
  const learnedWordIds: string[] = []

  const seedCount = 140
  for (let i = 0; i < seedCount; i++) {
    const word = ds.wordByNumber.get(i + 1)
    if (!word) break
    const roll = rng()
    let status: WordStatus = 'new'
    if (roll > 0.82) status = 'mastered'
    else if (roll > 0.55) status = 'familiar'
    else if (roll > 0.28) status = 'learning'
    else continue // leave as 'new' => no row

    const correct = 1 + Math.floor(rng() * 8)
    const wrong = Math.floor(rng() * 3)
    // status is guaranteed non-'new' here (the 'new' case continued above)
    learned++
    learnedWordIds.push(word.id)
    if (status === 'mastered') mastered++

    const key = progressKey(CURRENT_USER_ID, word.id)
    draft.wordProgress[key] = {
      id: makeId('uwp', i + 1),
      user_id: CURRENT_USER_ID,
      word_id: word.id,
      status,
      correct_count: correct,
      wrong_count: wrong,
      recall_streak: status === 'mastered' ? 4 + Math.floor(rng() * 4) : Math.floor(rng() * 3),
      next_review_at: isoDaysAgo(-1 * Math.floor(rng() * 3)), // some due soon
      last_reviewed_at: isoDaysAgo(Math.floor(rng() * 6)),
      created_at: isoDaysAgo(30 - Math.floor(rng() * 20)),
      updated_at: isoDaysAgo(Math.floor(rng() * 6)),
    }
  }

  const stats: UserStats = {
    user_id: CURRENT_USER_ID,
    total_xp: 1480,
    current_streak: 14,
    longest_streak: 21,
    words_learned: learned,
    words_mastered: mastered,
    last_activity_at: NOW,
  }
  draft.stats[CURRENT_USER_ID] = stats

  // Daily progress for the last 21 days — mostly completed to justify streak.
  for (let d = 20; d >= 0; d--) {
    const missed = d === 16 || d === 19 // a couple of gaps historically
    const date = dateDaysAgo(d)
    const goal = 10
    const newWords = missed ? 3 : goal
    draft.dailyProgress[dailyKey(CURRENT_USER_ID, date)] = {
      id: makeId('dp', d + 1),
      user_id: CURRENT_USER_ID,
      date,
      goal,
      new_words_completed: newWords,
      reviews_completed: missed ? 2 : 6 + Math.floor(rng() * 6),
      challenge_completed: !missed && rng() > 0.4,
      xp_earned: missed ? 20 : 55 + Math.floor(rng() * 40),
      completed: !missed,
      created_at: isoDaysAgo(d),
    }
  }
}

function seedLeaderboard(draft: UserDataShape) {
  const rng = makeRng(7)
  const board: UserDataShape['demoLeaderboard'] = DEMO_NAMES.map((name, i) => {
    const xp = 400 + Math.floor(rng() * 2600)
    const profile: Profile = {
      id: `demo-user-${i + 1}`,
      display_name: name,
      avatar_id: ['coral', 'mint', 'ink', 'sand'][i % 4],
      daily_goal: 10,
      current_book_id: null,
      created_at: isoDaysAgo(60),
      updated_at: NOW,
    }
    const stats: UserStats = {
      user_id: profile.id,
      total_xp: xp,
      current_streak: Math.floor(rng() * 30),
      longest_streak: 10 + Math.floor(rng() * 40),
      words_learned: Math.floor(xp / 8),
      words_mastered: Math.floor(xp / 20),
      last_activity_at: isoDaysAgo(Math.floor(rng() * 3)),
    }
    return { profile, stats }
  })
  draft.demoLeaderboard = board
}
