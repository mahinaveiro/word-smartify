'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { createRandomizedQuizCards, shuffleArray } from '@/lib/quiz-randomizer'
import { filterLearningQuestions } from '@/lib/learning-question-filter'
import { getLevelIndex, isLevelAccessible, LEVEL_LOCKED_MESSAGE } from '@/lib/level-access'
import type { QuizQuestion, Word } from '@/types/database'

export interface SessionCard {
  word: Word
  question: QuizQuestion
}

/**
 * Loads every word in a level plus one randomized quiz question each.
 * Question selection, card order, and option order are all created once when
 * this session payload is fetched, so rerenders do not reshuffle the session.
 */
export function useSessionData(levelId: string | null) {
  const userId = useAuth().user?.id ?? null

  return useSWR(userId && levelId ? ['session', userId, levelId] : null, async (): Promise<SessionCard[]> => {
    const level = await repositories.levels.getLevel(levelId as string)
    if (!level) throw new Error('This level is not available.')

    const bookId = await repositories.levels.getBookIdForLevel(level.id)
    if (!bookId) throw new Error('This level is not available.')

    const [levels, progress] = await Promise.all([
      repositories.levels.getLevelsForBook(bookId),
      repositories.wordProgress.getLevelProgress(userId as string, bookId),
    ])
    const levelIndex = getLevelIndex(levels, level.id)
    if (levelIndex === -1 || !isLevelAccessible(levels, progress, level.id)) {
      throw new Error(LEVEL_LOCKED_MESSAGE)
    }

    const words = await repositories.words.getWordsForLevel(levelId as string)
    if (words.length < 10) throw new Error('This level does not contain the required 10 learning words.')
    const sessionWords = shuffleArray(words).slice(0, 10)
    const questions = await repositories.quizzes.getQuizQuestionsForWords(sessionWords.map((word) => word.id))
    const learningQuestions = filterLearningQuestions(questions)
    const questionsByWord = new Map<string, QuizQuestion[]>()

    for (const question of learningQuestions) {
      const wordQuestions = questionsByWord.get(question.word_id) ?? []
      wordQuestions.push(question)
      questionsByWord.set(question.word_id, wordQuestions)
    }

    return createRandomizedQuizCards(sessionWords, questionsByWord)
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
