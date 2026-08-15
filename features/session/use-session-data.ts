'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { createRandomizedQuizCards, shuffleArray } from '@/lib/quiz-randomizer'
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
  return useSWR(levelId ? ['session', levelId] : null, async (): Promise<SessionCard[]> => {
    const words = await repositories.words.getWordsForLevel(levelId as string)
    if (words.length < 10) throw new Error('This level does not contain the required 10 learning words.')
    const sessionWords = shuffleArray(words).slice(0, 10)
    const questions = await repositories.quizzes.getQuizQuestionsForWords(sessionWords.map((word) => word.id))
    const questionsByWord = new Map<string, QuizQuestion[]>()

    for (const question of questions) {
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
