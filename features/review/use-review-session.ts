'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { buildReviewQueue, DEFAULT_REVIEW_QUEUE_LIMIT } from '@/lib/review-scheduler'
import type { QuizQuestion, Word } from '@/types/database'

export interface ReviewCard {
  word: Word
  question: QuizQuestion
}

export function useReviewSession(limit = DEFAULT_REVIEW_QUEUE_LIMIT) {
  const uid = useAuth().user?.id ?? null
  return useSWR(uid ? ['review-session', uid, limit] : null, async (): Promise<ReviewCard[]> => {
    const allProgress = await repositories.wordProgress.getAllProgress(uid as string)
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
