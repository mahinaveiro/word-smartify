/**
 * Word Smartify — database contract types.
 *
 * These mirror the EXISTING external Supabase schema exactly (snake_case
 * column names, nullable fields). The local repository layer produces and
 * consumes these shapes so the future Supabase implementation is a 1:1 swap.
 *
 * DO NOT couple UI components to these raw rows beyond what the repository
 * interfaces expose.
 */

export type UUID = string
export type ISODate = string // 'YYYY-MM-DD'
export type ISOTimestamp = string // ISO 8601

// ---------------------------------------------------------------------------
// Content tables (publicly readable)
// ---------------------------------------------------------------------------

export interface Book {
  id: UUID
  name: string
  slug: string
  description: string | null
  word_count: number
  display_order: number
  is_locked: boolean
  created_at: ISOTimestamp
}

export interface Chapter {
  id: UUID
  book_id: UUID
  chapter_number: number
  title: string
  display_order: number
  created_at: ISOTimestamp
}

export interface Level {
  id: UUID
  chapter_id: UUID
  level_number: number
  title: string
  display_order: number
  word_count: number
  created_at: ISOTimestamp
}

export type WordDifficulty = 'easy' | 'medium' | 'hard'

export interface Word {
  id: UUID
  level_id: UUID
  book_word_number: number
  word: string
  pronunciation: string | null
  english_meaning: string
  bangla_meaning: string | null
  example_sentence: string | null
  mnemonic: string | null
  synonyms: string[] | null
  antonyms: string[] | null
  difficulty: WordDifficulty | null
  created_at: ISOTimestamp
}

export type QuestionType =
  | 'meaning'
  | 'synonym'
  | 'antonym'
  | 'context'
  | 'bangla'
  | 'recall'
  | 'pronunciation'
  | 'usage'
  | 'fill_blank'

export interface QuizQuestion {
  id: UUID
  word_id: UUID
  question_type: QuestionType
  question: string
  options: string[] | null
  correct_answer: string
  explanation: string | null
  difficulty: WordDifficulty | null
  created_at: ISOTimestamp
}

// ---------------------------------------------------------------------------
// User tables (owner-scoped)
// ---------------------------------------------------------------------------

export interface Profile {
  id: UUID // -> auth.users.id
  display_name: string
  avatar_id: string
  daily_goal: number
  current_book_id: UUID | null
  created_at: ISOTimestamp
  updated_at: ISOTimestamp
}

export interface UserStats {
  user_id: UUID
  total_xp: number
  current_streak: number
  longest_streak: number
  words_learned: number
  words_mastered: number
  last_activity_at: ISOTimestamp | null
}

export type WordStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export interface UserWordProgress {
  id: UUID
  user_id: UUID
  word_id: UUID
  status: WordStatus
  correct_count: number
  wrong_count: number
  recall_streak: number
  next_review_at: ISOTimestamp | null
  last_reviewed_at: ISOTimestamp | null
  created_at: ISOTimestamp
  updated_at: ISOTimestamp
}

export interface DailyProgress {
  id: UUID
  user_id: UUID
  date: ISODate
  goal: number
  new_words_completed: number
  reviews_completed: number
  challenge_completed: boolean
  xp_earned: number
  completed: boolean
  created_at: ISOTimestamp
}

export interface BookProgressSummary {
  book_id: UUID
  total: number
  learned: number
  mastered: number
}

/** Public fields safe to show on profiles, leaderboards, and social surfaces. */
export interface PublicProfile {
  id: UUID
  display_name: string
  avatar_id: string
  current_streak: number
  longest_streak: number
  total_xp: number
  words_learned: number
  words_mastered: number
  book_progress: BookProgressSummary[]
}

// ---------------------------------------------------------------------------
// Mock tests
// ---------------------------------------------------------------------------

export interface MockTest {
  id: UUID
  user_id: UUID
  total_questions: number
  correct_answers: number
  score: number
  time_taken_seconds: number | null
  created_at: ISOTimestamp
}

export interface MockTestAnswer {
  id: UUID
  test_id: UUID
  question_id: UUID
  user_answer: string | null
  is_correct: boolean
  created_at: ISOTimestamp
}

export const QUIZZES_PER_WORD = 5

export const WORD_SMART_1_COUNT = 850
export const WORD_SMART_2_COUNT = 1038
export const TOTAL_WORD_COUNT = WORD_SMART_1_COUNT + WORD_SMART_2_COUNT // 1888
