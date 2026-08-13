'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import type { QuizQuestion, Word } from '@/types/database'

export interface SessionCard {
  word: Word
  question: QuizQuestion
}

/**
 * Loads every word in a level plus one representative quiz question each.
 * Returns them together so the session can run flashcards then quiz without
 * additional round-trips.
 */
export function useSessionData(levelId: string | null) {
  return useSWR(levelId ? ['session', levelId] : null, async (): Promise<SessionCard[]> => {
    const words = await repositories.words.getWordsForLevel(levelId as string)
    const cards = await Promise.all(
      words.map(async (word) => {
        const questions = await repositories.quizzes.getQuizQuestions(word.id)
        // Prefer a meaning question for the quiz phase; fall back to the first.
        const question = questions.find((q) => q.question_type === 'meaning') ?? questions[0]
        return { word, question }
      }),
    )
    return cards
  })
}
