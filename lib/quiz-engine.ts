/**
 * Quiz engine — pure, reusable answer-evaluation logic.
 *
 * This module knows nothing about XP, mastery, leaderboards, profiles, or
 * daily plans. It only turns a (question, selected answer) pair into a
 * deterministic result event. Every quiz-taking surface (learning sessions,
 * spaced review, mock tests) evaluates answers through this same engine,
 * then hands the resulting event to whichever system needs to react to it
 * (progress store, stats, daily plan, mock test log).
 */

import type { QuizQuestion } from '@/types/database'

export type QuizPhase = 'answering' | 'locked'

/** The one and only output of the engine — a clean, self-contained event. */
export interface QuizAnswerEvent {
  wordId: string
  questionId: string
  questionType: QuizQuestion['question_type']
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string | null
  answeredAt: string
}

/** Pure evaluation — no side effects, no repository access. */
export function evaluateAnswer(question: QuizQuestion, selectedAnswer: string): QuizAnswerEvent {
  return {
    wordId: question.word_id,
    questionId: question.id,
    questionType: question.question_type,
    selectedAnswer,
    correctAnswer: question.correct_answer,
    isCorrect: selectedAnswer === question.correct_answer,
    explanation: question.explanation,
    answeredAt: new Date().toISOString(),
  }
}
