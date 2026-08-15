import type { QuizQuestion, UUID, Word } from '@/types/database'

export interface QuizCard {
  word: Word
  question: QuizQuestion
}

/**
 * Fisher-Yates shuffle. The optional random source keeps the helper easy to
 * test while production callers use Math.random for a fresh session.
 */
export function shuffleArray<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function selectRandomQuestion(
  questions: readonly QuizQuestion[],
  random: () => number = Math.random,
): QuizQuestion | null {
  if (questions.length === 0) return null
  return questions[Math.floor(random() * questions.length)] ?? null
}

/**
 * Returns a new question object whose options are shuffled only for display.
 * The stored row and its correct_answer value are never mutated.
 */
export function prepareQuizQuestion(
  question: QuizQuestion,
  random: () => number = Math.random,
): QuizQuestion {
  const options = question.options && question.options.length > 1
    ? shuffleArray([...new Set([...question.options, question.correct_answer])], random)
    : question.options

  return {
    ...question,
    question: formatQuestionForDisplay(question),
    options,
  }
}

/**
 * Creates a repeatable pseudo-random source for persisted test payloads. A
 * mock test may be re-fetched by SWR, so using Math.random here would make the
 * same saved question appear with a different option order after a refresh.
 */
export function createSeededRandom(seed: string): () => number {
  let state = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index)
    state = Math.imul(state, 16777619)
  }

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function formatQuestionForDisplay(question: QuizQuestion): string {
  if (!['context', 'context_mcq'].includes(question.question_type) || question.question.includes('_______')) {
    return question.question
  }

  const sentenceMatch = question.question.match(/[“\"]([^”\"]+)[”\"]/)
  const target = sentenceMatch?.[1] ?? question.question
  const answer = question.correct_answer.trim()
  if (!answer) return question.question

  const exactPattern = new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'i')
  const answerRoot = answer.replace(/[^a-zA-Z]+/g, '')
  const rootPattern = new RegExp(`\\b${escapeRegExp(answerRoot)}[a-zA-Z]*\\b`, 'i')
  const replacementPattern = exactPattern.test(target) ? exactPattern : rootPattern
  if (!replacementPattern.test(target)) return question.question

  const masked = target.replace(replacementPattern, '_______')
  return sentenceMatch
    ? question.question.replace(sentenceMatch[1], masked)
    : question.question.replace(target, masked)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function selectPreparedQuestion(
  questions: readonly QuizQuestion[],
  context: string,
  random: () => number = Math.random,
): QuizQuestion {
  const question = selectRandomQuestion(questions, random)
  if (!question) throw new Error(`No quiz question available for ${context}.`)
  return prepareQuizQuestion(question, random)
}

export function selectQuestionForWord(
  wordId: UUID,
  questionsByWord: ReadonlyMap<UUID, readonly QuizQuestion[]>,
  random: () => number = Math.random,
): QuizQuestion {
  return selectPreparedQuestion(questionsByWord.get(wordId) ?? [], `word ${wordId}`, random)
}

export function createRandomizedQuizCards(
  words: readonly Word[],
  questionsByWord: ReadonlyMap<UUID, readonly QuizQuestion[]>,
  random: () => number = Math.random,
): QuizCard[] {
  const cards = words.map((word) => ({
    word,
    question: selectQuestionForWord(word.id, questionsByWord, random),
  }))
  return shuffleArray(cards, random)
}
