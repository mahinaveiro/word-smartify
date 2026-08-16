'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { buildReviewQueue, buildWeakWordQueue, DEFAULT_REVIEW_QUEUE_LIMIT, WEAK_DRILL_LIMIT } from '@/lib/review-scheduler'
import { createSeededRandom, prepareQuizQuestion } from '@/lib/quiz-randomizer'
import type { QuizQuestion, UserWordProgress, Word } from '@/types/database'

export type ReviewMode = 'scheduled' | 'weak' | 'mock_recovery'

export interface ReviewCard {
  word: Word
  question: QuizQuestion
  progress: UserWordProgress | null
}

export function useReviewSession(
  limit = DEFAULT_REVIEW_QUEUE_LIMIT,
  mode: ReviewMode = 'scheduled',
  targetWordIds?: string[],
) {
  const uid = useAuth().user?.id ?? null
  const effectiveLimit = mode === 'scheduled' ? limit : Math.min(limit, WEAK_DRILL_LIMIT)
  const targetKey = targetWordIds?.join(',') ?? ''
  const targetReady = mode !== 'mock_recovery' || targetWordIds != null

  return useSWR(uid && targetReady ? ['review-session', uid, mode, effectiveLimit, targetKey] : null, async (): Promise<ReviewCard[]> => {
    const allProgress = await repositories.wordProgress.getAllProgress(uid as string)
    const progressByWordId = new Map(allProgress.map((progress) => [progress.word_id, progress]))
    const queue = mode === 'mock_recovery'
      ? (targetWordIds ?? []).slice(0, effectiveLimit).map((wordId) => ({
          wordId,
          progress: progressByWordId.get(wordId) ?? null,
        }))
      : (mode === 'weak' ? buildWeakWordQueue(allProgress, effectiveLimit) : buildReviewQueue(allProgress, { limit: effectiveLimit }))
          .map((progress) => ({ wordId: progress.word_id, progress }))

    const cards = await Promise.all(
      queue.map(async ({ wordId, progress }): Promise<ReviewCard> => {
        const word = await repositories.words.getWord(wordId)
        if (!word) throw new Error(`Word ${wordId} could not be loaded for review.`)
        const questions = await repositories.quizzes.getQuizQuestions(wordId)
        const question = selectReviewQuestion(questions, progress, `${mode}:${wordId}`)
        return { word, question, progress }
      }),
    )

    return cards
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}

function selectReviewQuestion(
  questions: QuizQuestion[],
  progress: UserWordProgress | null,
  context: string,
): QuizQuestion {
  if (questions.length === 0) throw new Error(`No quiz question available for ${context}.`)

  // Rotate the source question by attempt count so a repeated recovery drill
  // does not keep showing the same format when alternatives exist.
  const attemptIndex = progress ? progress.correct_count + progress.wrong_count : 0
  const ordered = [...questions].sort((a, b) => a.question_type.localeCompare(b.question_type) || a.id.localeCompare(b.id))
  const question = ordered[attemptIndex % ordered.length] ?? ordered[0]
  return prepareQuizQuestion(question, createSeededRandom(`${context}:${attemptIndex}`))
}
