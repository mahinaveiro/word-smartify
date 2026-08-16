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
    weak: number
  }
  challenge: {
    available: boolean
    completed: boolean
  }
  xpEarned: number
  dayComplete: boolean
  nextAction: {
    title: string
    detail: string
    href: string
    action: string
  }
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
  weakWordCount: number
  levels: Level[]
  levelProgress: Record<string, LevelProgressRollup>
}): DailyPlan {
  const nextLevel = pickNextLearningLevel(input.levels, input.levelProgress)
  const newWordsRemaining = Math.max(0, input.dailyGoal - (input.today?.new_words_completed ?? 0))
  const dayComplete = (input.today?.new_words_completed ?? 0) >= input.dailyGoal
  const dueCount = input.dueReviewQueue.length
  const nextAction = dueCount > 0
    ? {
        title: 'Review due words',
        detail: `${dueCount} word${dueCount === 1 ? '' : 's'} ready for recall practice.`,
        href: '/review',
        action: 'Start review',
      }
    : input.weakWordCount > 0
      ? {
          title: 'Recover weak words',
          detail: `${input.weakWordCount} word${input.weakWordCount === 1 ? '' : 's'} need another retrieval attempt.`,
          href: '/review/weak',
          action: 'Start weak drill',
        }
      : newWordsRemaining > 0 && nextLevel
        ? {
            title: 'Learn new words',
            detail: `${newWordsRemaining} word${newWordsRemaining === 1 ? '' : 's'} left in today\'s goal.`,
            href: `/session/${nextLevel.id}`,
            action: 'Start learning',
          }
        : !(input.today?.challenge_completed ?? false)
          ? {
              title: 'Take today\'s challenge',
              detail: 'A short mixed quiz to keep your recall active.',
              href: '/challenge',
              action: 'Start challenge',
            }
          : {
              title: 'Keep exploring',
              detail: 'Your plan is clear. Browse the next level when you are ready.',
              href: nextLevel ? `/session/${nextLevel.id}` : '/learn',
              action: nextLevel ? 'Open next level' : 'Open Learn',
            }
  return {
    date: input.date,
    goal: input.dailyGoal,
    currentBook: input.currentBook,
    newLearning: { level: nextLevel, remaining: newWordsRemaining },
    progress: {
      newWordsCompleted: input.today?.new_words_completed ?? 0,
      reviewsCompleted: input.today?.reviews_completed ?? 0,
    },
    review: { due: dueCount, weak: input.weakWordCount },
    challenge: {
      available: !(input.today?.challenge_completed ?? false),
      completed: input.today?.challenge_completed ?? false,
    },
    xpEarned: input.today?.xp_earned ?? 0,
    dayComplete,
    nextAction,
  }
}
