'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { buildReviewQueue, DEFAULT_REVIEW_QUEUE_LIMIT } from '@/lib/review-scheduler'
import { selectPreparedQuestion } from '@/lib/quiz-randomizer'
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
      queue.map(async (p): Promise<ReviewCard> => {
        const word = await repositories.words.getWord(p.word_id)
        if (!word) throw new Error(`Word ${p.word_id} could not be loaded for review.`)
        const questions = await repositories.quizzes.getQuizQuestions(p.word_id)
        return { word, question: selectPreparedQuestion(questions, `word ${p.word_id}`) }
      }),
    )

    return cards
  })
}
