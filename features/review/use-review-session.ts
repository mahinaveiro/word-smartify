'use client'

import useSWR from 'swr'
import { repositories, getActiveUserId } from '@/repositories'
import { buildReviewQueue, DEFAULT_REVIEW_QUEUE_LIMIT } from '@/lib/review-scheduler'
import type { QuizQuestion, Word } from '@/types/database'

export interface ReviewCard {
  word: Word
  question: QuizQuestion
}

/**
 * Builds today's review queue (due + weak words) and hydrates each entry
 * with its word + a representative quiz question, ready for a quiz-only
 * review session. Reuses the same repository calls as level sessions and
 * mock tests — no separate data path, no duplicated fetch logic.
 */
export function useReviewSession(limit = DEFAULT_REVIEW_QUEUE_LIMIT) {
  const uid = getActiveUserId()
  return useSWR(['review-session', uid, limit], async (): Promise<ReviewCard[]> => {
    const allProgress = await repositories.wordProgress.getAllProgress(uid)
    const queue = buildReviewQueue(allProgress, { limit })

    const cards = await Promise.all(
      queue.map(async (p): Promise<ReviewCard | null> => {
        const word = await repositories.words.getWord(p.word_id)
        if (!word) return null
        const questions = await repositories.quizzes.getQuizQuestions(p.word_id)
        const question = questions.find((q) => q.question_type === 'meaning') ?? questions[0]
        if (!question) return null
        return { word, question }
      }),
    )

    return cards.filter((c): c is ReviewCard => c != null)
  })
}
