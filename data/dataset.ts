/**
 * Deterministic content dataset generator for the LOCAL data layer.
 *
 * Produces the exact structural counts from the contract:
 *   - Word Smart I:  850 words, levels 1..85
 *   - Word Smart II: 1038 words, levels 86..189
 *   - 5 quiz questions per word  => 9,440 total questions
 *
 * Content questions are lazily generated per-word and cached, so opening one
 * level does NOT build the entire quiz dataset. The words/levels index is
 * built once (cheap: ~1,888 small rows).
 */

import type {
  Book,
  Chapter,
  Level,
  QuestionType,
  QuizQuestion,
  Word,
  WordDifficulty,
} from '@/types/database'
import {
  QUIZZES_PER_WORD,
  WORD_SMART_1_COUNT,
  WORD_SMART_2_COUNT,
} from '@/types/database'
import { VOCAB_POOL, DISTRACTOR_MEANINGS, type VocabEntry } from './vocabulary-pool'
import { makeId, makeRng, NOW, pick, shuffle } from './seed-utils'

const WORDS_PER_LEVEL = 10
const LEVELS_1 = Math.ceil(WORD_SMART_1_COUNT / WORDS_PER_LEVEL) // 85
const LEVELS_2 = Math.ceil(WORD_SMART_2_COUNT / WORDS_PER_LEVEL) // 104

const DIFFICULTIES: WordDifficulty[] = ['easy', 'medium', 'hard']
const QUESTION_TYPES: QuestionType[] = [
  'meaning',
  'synonym',
  'antonym',
  'context',
  'bangla',
  'recall',
  'usage',
  'fill_blank',
]

interface Dataset {
  books: Book[]
  chapters: Chapter[]
  levels: Level[]
  words: Word[]
  wordsByLevel: Map<string, Word[]>
  wordById: Map<string, Word>
  wordByNumber: Map<number, Word>
  levelById: Map<string, Level>
  levelByNumber: Map<number, Level>
  wordsByBook: Map<string, Word[]>
}

let cache: Dataset | null = null
const quizCache = new Map<string, QuizQuestion[]>()

function distinct(entry: VocabEntry, globalIndex: number) {
  // Give each tiled instance a stable "sense number" so repeats look distinct.
  const sense = Math.floor(globalIndex / VOCAB_POOL.length)
  const suffix = sense === 0 ? '' : ` (${['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sense] ?? sense + 1})`
  return {
    display: `${entry.word}${suffix}`,
    meaning:
      sense === 0
        ? entry.meaning
        : `${entry.meaning}; also ${DISTRACTOR_MEANINGS[globalIndex % DISTRACTOR_MEANINGS.length]}`,
  }
}

function build(): Dataset {
  if (cache) return cache

  const books: Book[] = [
    {
      id: makeId('book', 1),
      name: 'Word Smart I',
      slug: 'word-smart-1',
      description: 'The essential first 850 words every serious reader should own.',
      word_count: WORD_SMART_1_COUNT,
      display_order: 1,
      is_locked: false,
      created_at: NOW,
    },
    {
      id: makeId('book', 2),
      name: 'Word Smart II',
      slug: 'word-smart-2',
      description: '1,038 more advanced words to sharpen a formidable vocabulary.',
      word_count: WORD_SMART_2_COUNT,
      display_order: 2,
      is_locked: false,
      created_at: NOW,
    },
  ]

  const chapters: Chapter[] = [
    {
      id: makeId('chap', 1),
      book_id: books[0].id,
      chapter_number: 1,
      title: 'Word Smart I Vocabulary',
      display_order: 1,
      created_at: NOW,
    },
    {
      id: makeId('chap', 2),
      book_id: books[1].id,
      chapter_number: 1,
      title: 'Word Smart II Vocabulary',
      display_order: 1,
      created_at: NOW,
    },
  ]

  const levels: Level[] = []
  const words: Word[] = []
  const wordsByLevel = new Map<string, Word[]>()
  const wordById = new Map<string, Word>()
  const wordByNumber = new Map<number, Word>()
  const levelById = new Map<string, Level>()
  const levelByNumber = new Map<number, Level>()
  const wordsByBook = new Map<string, Word[]>()

  let globalWordNumber = 0

  const makeBook = (
    bookIndex: number,
    bookId: string,
    chapterId: string,
    levelCount: number,
    wordTarget: number,
    startLevelNumber: number,
  ) => {
    let wordsMadeForBook = 0
    for (let l = 0; l < levelCount; l++) {
      const levelNumber = startLevelNumber + l
      const remaining = wordTarget - wordsMadeForBook
      const wordsThisLevel = Math.min(WORDS_PER_LEVEL, remaining)

      const level: Level = {
        id: makeId('levl', levelNumber),
        chapter_id: chapterId,
        level_number: levelNumber,
        title: `Level ${levelNumber}`,
        display_order: levelNumber,
        word_count: wordsThisLevel,
        created_at: NOW,
      }
      levels.push(level)
      levelById.set(level.id, level)
      levelByNumber.set(levelNumber, level)
      const bookWords = wordsByBook.get(bookId) ?? []
      wordsByBook.set(bookId, bookWords)

      const levelWords: Word[] = []
      for (let w = 0; w < wordsThisLevel; w++) {
        globalWordNumber++
        wordsMadeForBook++
        const entry = VOCAB_POOL[(globalWordNumber - 1) % VOCAB_POOL.length]
        const { display, meaning } = distinct(entry, globalWordNumber - 1)
        const rng = makeRng(globalWordNumber * 131 + bookIndex)
        const word: Word = {
          id: makeId('word', globalWordNumber),
          level_id: level.id,
          book_word_number: globalWordNumber,
          word: display,
          pronunciation: entry.pronunciation,
          english_meaning: meaning,
          bangla_meaning: entry.bangla,
          example_sentence: entry.example,
          mnemonic: entry.mnemonic,
          synonyms: entry.synonyms,
          antonyms: entry.antonyms,
          difficulty: DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)],
          created_at: NOW,
        }
        words.push(word)
        levelWords.push(word)
        bookWords.push(word)
        wordById.set(word.id, word)
        wordByNumber.set(globalWordNumber, word)
      }
      wordsByLevel.set(level.id, levelWords)
    }
  }

  makeBook(0, books[0].id, chapters[0].id, LEVELS_1, WORD_SMART_1_COUNT, 1)
  makeBook(1, books[1].id, chapters[1].id, LEVELS_2, WORD_SMART_2_COUNT, LEVELS_1 + 1)

  cache = {
    books,
    chapters,
    levels,
    words,
    wordsByLevel,
    wordById,
    wordByNumber,
    levelById,
    levelByNumber,
    wordsByBook,
  }
  return cache
}

export function getDataset(): Dataset {
  return build()
}

export function getWordsForBook(bookId: string): Word[] {
  return getDataset().wordsByBook.get(bookId) ?? []
}

/** Lazily generate + cache the 5 quiz questions for one word. */
export function getQuizForWord(wordId: string): QuizQuestion[] {
  const existing = quizCache.get(wordId)
  if (existing) return existing

  const ds = build()
  const word = ds.wordById.get(wordId)
  if (!word) return []

  const rng = makeRng(word.book_word_number * 977 + 13)
  const baseEntry = VOCAB_POOL[(word.book_word_number - 1) % VOCAB_POOL.length]
  const otherMeanings = shuffle(
    VOCAB_POOL.filter((v) => v.word !== baseEntry.word).map((v) => v.meaning),
    rng,
  )
  const otherWords = shuffle(
    VOCAB_POOL.filter((v) => v.word !== baseEntry.word).map((v) => v.word),
    rng,
  )

  const chosenTypes = shuffle(QUESTION_TYPES, rng).slice(0, QUIZZES_PER_WORD)
  const questions: QuizQuestion[] = chosenTypes.map((type, i) => {
    const id = makeId(`quiz${i}`, word.book_word_number)
    const wrong3 = <T,>(pool: T[]) => pool.slice(0, 3)

    switch (type) {
      case 'meaning': {
        const options = shuffle([word.english_meaning, ...wrong3(otherMeanings)], rng)
        return q(id, word.id, type, `What does "${word.word}" mean?`, options, word.english_meaning, `"${word.word}" means: ${word.english_meaning}.`)
      }
      case 'synonym': {
        const correct = baseEntry.synonyms[0]
        const options = shuffle([correct, ...wrong3(baseEntry.antonyms.concat(otherWords))], rng)
        return q(id, word.id, type, `Which is closest in meaning to "${word.word}"?`, options, correct, `A synonym of "${word.word}" is "${correct}".`)
      }
      case 'antonym': {
        const correct = baseEntry.antonyms[0] ?? otherWords[0]
        const options = shuffle([correct, ...wrong3(baseEntry.synonyms.concat(otherWords))], rng)
        return q(id, word.id, type, `Which is most nearly OPPOSITE to "${word.word}"?`, options, correct, `An antonym of "${word.word}" is "${correct}".`)
      }
      case 'bangla': {
        const correct = word.bangla_meaning ?? word.english_meaning
        const wrongB = shuffle(
          VOCAB_POOL.filter((v) => v.bangla !== correct).map((v) => v.bangla),
          rng,
        )
        const options = shuffle([correct, ...wrongB.slice(0, 3)], rng)
        return q(id, word.id, type, `Bangla meaning of "${word.word}"?`, options, correct, `"${word.word}" in Bangla: ${correct}.`)
      }
      case 'context':
      case 'usage': {
        const options = shuffle([word.word, ...wrong3(otherWords)], rng)
        const sentence = (word.example_sentence ?? '').replace(new RegExp(baseEntry.word, 'i'), '_____')
        return q(id, word.id, type, `Choose the word that best fits: "${sentence}"`, options, word.word, word.example_sentence ?? '')
      }
      case 'fill_blank': {
        const options = shuffle([word.word, ...wrong3(otherWords)], rng)
        return q(id, word.id, type, `Fill in the blank: "The ${pick(['sudden', 'quiet', 'strange', 'bold'], rng)} _____ surprised everyone." (best match)`, options, word.word, `"${word.word}" — ${word.english_meaning}.`)
      }
      case 'recall':
      default: {
        const options = shuffle([word.word, ...wrong3(otherWords)], rng)
        return q(id, word.id, 'recall', `Which word means "${word.english_meaning.split(';')[0]}"?`, options, word.word, `That word is "${word.word}".`)
      }
    }
  })

  quizCache.set(wordId, questions)
  return questions
}

function q(
  id: string,
  wordId: string,
  type: QuestionType,
  question: string,
  options: string[],
  correct: string,
  explanation: string,
): QuizQuestion {
  return {
    id,
    word_id: wordId,
    question_type: type,
    question,
    options,
    correct_answer: correct,
    explanation,
    difficulty: null,
    created_at: NOW,
  }
}
