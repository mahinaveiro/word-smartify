import type {
  Book,
  DailyProgress,
  Level,
  UserWordProgress,
} from '@/types/database'

export interface DailyPlan {
  date: string
  goal: number
  currentBook: Book | null
  newLearning: {
    level: Level | null
    remaining: number
  }
  progress: {
    newWordsCompleted: number
    reviewsCompleted: number
  }
  review: {
    due: number
  }
  challenge: {
    available: boolean
    completed: boolean
  }
  xpEarned: number
  dayComplete: boolean
}

export interface LevelProgressRollup {
  level_id: string
  total: number
  learned: number
  mastered: number
}

export function pickNextLearningLevel(
  levels: Level[],
  progress: Record<string, LevelProgressRollup>,
): Level | null {
  return levels.find((level) => (progress[level.id]?.learned ?? 0) < (progress[level.id]?.total ?? level.word_count)) ?? null
}

export function buildDailyPlan(input: {
  date: string
  dailyGoal: number
  currentBook: Book | null
  today: DailyProgress | null
  dueReviewQueue: UserWordProgress[]
  levels: Level[]
  levelProgress: Record<string, LevelProgressRollup>
}): DailyPlan {
  const nextLevel = pickNextLearningLevel(input.levels, input.levelProgress)
  const newWordsRemaining = Math.max(0, input.dailyGoal - (input.today?.new_words_completed ?? 0))
  return {
    date: input.date,
    goal: input.dailyGoal,
    currentBook: input.currentBook,
    newLearning: { level: nextLevel, remaining: newWordsRemaining },
    progress: {
      newWordsCompleted: input.today?.new_words_completed ?? 0,
      reviewsCompleted: input.today?.reviews_completed ?? 0,
    },
    review: { due: input.dueReviewQueue.length },
    challenge: {
      available: !(input.today?.challenge_completed ?? false),
      completed: input.today?.challenge_completed ?? false,
    },
    xpEarned: input.today?.xp_earned ?? 0,
    dayComplete: (input.today?.new_words_completed ?? 0) >= input.dailyGoal,
  }
}
