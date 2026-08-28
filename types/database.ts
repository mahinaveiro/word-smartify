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
export type WordPartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'interjection'
  | 'numeral'
  | 'phrase'

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
  part_of_speech: WordPartOfSpeech
  difficulty: WordDifficulty | null
  created_at: ISOTimestamp
}

export interface DictionarySearchFilters {
  query?: string
  book_id?: UUID | null
  level_id?: UUID | null
  letter?: string | null
}

export interface SavedWord {
  id: UUID
  user_id: UUID
  word_id: UUID
  created_at: ISOTimestamp
}

export interface SavedWordWithWord extends SavedWord {
  word: Word
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
  /** Normalized from the live quiz_questions.options JSONB column. */
  options: string[] | null
  correct_answer: string
  explanation: string | null
  difficulty: WordDifficulty | null
  created_at: ISOTimestamp
}

// ---------------------------------------------------------------------------
// User tables (owner-scoped)
// ---------------------------------------------------------------------------

export type DailyGoal = 5 | 10 | 15 | 20 | 30
export type ThemePreference = 'light' | 'dark'

export interface Profile {
  id: UUID // -> auth.users.id
  display_name: string
  avatar_id: string
  avatar_url: string | null
  daily_goal: DailyGoal
  current_book_id: UUID | null
  study_gc_joined: boolean
  theme_preference: ThemePreference
  created_at: ISOTimestamp
  updated_at: ISOTimestamp
}

export interface LeaderboardProfile extends Pick<Profile, 'id' | 'display_name' | 'avatar_id' | 'avatar_url'> {
  badges: DisplayBadge[]
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

export type WordStatus = 'new' | 'learning' | 'strong' | 'mastered'

export type LeaderboardStats = Pick<
  UserStats,
  'user_id' | 'total_xp' | 'current_streak' | 'longest_streak' | 'words_learned' | 'words_mastered'
> & {
  weekly_xp?: number
}

export type LeaderboardMode = 'all_time' | 'weekly'

export interface LeaderboardEntry {
  rank: number
  profile: LeaderboardProfile
  stats: LeaderboardStats
}

export interface LeaderboardResult {
  mode: LeaderboardMode
  week_start: ISODate
  week_end: ISODate
  entries: LeaderboardEntry[]
  current_user: LeaderboardEntry | null
}

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

export interface AchievementBadge {
  id: string
  title: string
  description: string
}

export type BadgeAwardKind = 'permanent' | 'weekly_champion'

export interface BadgeAward {
  id: UUID
  user_id: UUID
  badge_key: string
  award_kind: BadgeAwardKind
  week_start: ISODate | null
  week_end: ISODate | null
  placement: number | null
  awarded_at: ISOTimestamp
  acknowledged_at: ISOTimestamp | null
}

export interface DisplayBadge {
  key: string
  title: string
  shortTitle: string
  description: string
  reason: string
  assetSrc: string
  category: 'owner' | 'contributor' | 'weekly_champion'
  awardKind: BadgeAwardKind
  tone: 'gold' | 'violet' | 'mint' | 'coral' | 'sky'
  priority: number
  awardId: UUID | null
  awardedAt: ISOTimestamp | null
  weekStart: ISODate | null
  weekEnd: ISODate | null
  placement: number | null
  isCurrent: boolean
}

export interface PendingBadgeAward extends BadgeAward {
  display: DisplayBadge
}

export interface PublicLeaderboardSummary {
  current_week_rank: number | null
  highest_weekly_rank: number | null
  weekly_wins: number
  weekly_second_places: number
  weekly_third_places: number
  weeks_ranked: number
  best_weekly_xp: number
  all_time_rank: number | null
}

export interface PublicMockTestSummary {
  tests_taken: number
  average_score: number | null
  highest_score: number | null
  average_percentage: number | null
  best_percentage: number | null
}

/** Public fields safe to show on profiles, leaderboards, and social surfaces. */
export type ViewerFriendshipState = 'none' | 'outgoing_pending' | 'incoming_pending' | 'friends' | 'blocked'

export interface PublicProfile {
  id: UUID
  display_name: string
  avatar_id: string
  avatar_url: string | null
  current_streak: number
  longest_streak: number
  total_xp: number
  words_learned: number
  words_mastered: number
  book_progress: BookProgressSummary[]
  achievements: AchievementBadge[]
  badges: DisplayBadge[]
  leaderboard: PublicLeaderboardSummary
  mock_tests: PublicMockTestSummary
  relationship?: ViewerFriendshipState
  relationship_id?: UUID | null
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


// ---------------------------------------------------------------------------
// Social and Combat
// ---------------------------------------------------------------------------

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed'
export type PresenceState = 'online' | 'learning' | 'reviewing' | 'mock_test' | 'in_combat' | 'idle' | 'offline'
export type CombatPreset = 'sprint' | 'standard' | 'custom'
export type CombatSourceMode = 'mixed' | 'level' | 'book' | 'letter' | 'smart'
export interface CombatQuestionSource {
  mode: CombatSourceMode
  level_from?: number
  level_to?: number
  book_id?: UUID
  letter?: string
}
export type CombatMatchStatus = 'waiting' | 'ready' | 'active' | 'completed' | 'draw' | 'cancelled' | 'expired' | 'abandoned' | 'no_contest'

export interface SocialProfile {
  id: UUID
  display_name: string
  avatar_id: string
  avatar_url: string | null
  presence: PresenceState
  last_seen_at: ISOTimestamp | null
  relationship?: ViewerFriendshipState
  relationship_id?: UUID | null
}

export interface Friendship {
  id: UUID
  requester_id: UUID
  addressee_id: UUID
  status: FriendshipStatus
  created_at: ISOTimestamp
  responded_at: ISOTimestamp | null
  other_user: SocialProfile
}

export interface UserPrivacy {
  user_id: UUID
  discoverable: boolean
  friend_challenges_enabled: boolean
  presence_visible: boolean
  updated_at: ISOTimestamp
}

export interface CombatMatchPlayer {
  id: UUID
  match_id: UUID
  user_id: UUID
  slot: 1 | 2
  is_ready: boolean
  correct_count: number
  answered_count: number
  total_time_ms: number
  joined_at: ISOTimestamp
  last_seen_at: ISOTimestamp
  profile: SocialProfile
}

export type CombatInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
export type CombatQuickMessage = 'Good luck!' | 'Nice one!' | 'I’m ready!' | 'That was close!'

export interface CombatInvite {
  id: UUID
  match_id: UUID
  sender_id: UUID
  recipient_id: UUID
  status: CombatInviteStatus
  created_at: ISOTimestamp
  responded_at: ISOTimestamp | null
  sender: SocialProfile
  match: CombatMatch | null
}

export interface CombatMatch {
  id: UUID
  host_id: UUID
  opponent_id: UUID | null
  visibility: 'private'
  join_code: string
  preset: CombatPreset
  question_count: number
  time_limit_seconds: number
  status: CombatMatchStatus
  current_question_index: number
  created_at: ISOTimestamp
  expires_at: ISOTimestamp
  started_at: ISOTimestamp | null
  current_question_started_at: ISOTimestamp | null
  finished_at: ISOTimestamp | null
  cancelled_at: ISOTimestamp | null
  updated_at: ISOTimestamp
  wager_xp: 0 | 100
  wager_status: 'none' | 'pending' | 'reserved' | 'settled' | 'refunded'
  question_source: CombatQuestionSource
  /** Current-round submission metadata, populated by the repository when available. */
  current_question_submissions?: UUID[]
  /** Authoritative winner for completed or abandonment outcomes; null for draws. */
  winner_id?: UUID | null
  /** Server-authoritative opponent grace deadline; absent on legacy matches. */
  round_grace_deadline?: ISOTimestamp | null
  wager_winner_id: UUID | null
  wager_settled_at: ISOTimestamp | null
  players: CombatMatchPlayer[]
}

export interface CombatQuestion {
  id: UUID
  question_id: UUID
  word_id: UUID
  position: number
  question: string
  options: string[]
}

export interface CombatAnswer {
  question_id: UUID
  selected_answer: string | null
  is_correct: boolean
  response_time_ms: number
  submitted_at: ISOTimestamp
}

export interface CombatReviewQuestion extends CombatQuestion {
  correct_answer: string
  explanation: string | null
  selected_answer: string | null
}

export type CombatOutcome = 'win' | 'loss' | 'draw' | 'cancelled' | 'expired' | 'abandoned' | 'no_contest'

export interface CombatResult {
  match: CombatMatch
  outcome: CombatOutcome
  winner_id: UUID | null
  my_score: number
  opponent_score: number
  my_accuracy: number
  opponent_accuracy: number
  my_total_time_ms: number
  opponent_total_time_ms: number
  my_answers: CombatAnswer[]
  opponent_answers: CombatAnswer[]
  missed_questions: CombatReviewQuestion[]
  wager_xp: 0 | 100
  wager_status: 'none' | 'pending' | 'reserved' | 'settled' | 'refunded'
  my_xp_delta: number
  opponent_xp_delta: number
}
