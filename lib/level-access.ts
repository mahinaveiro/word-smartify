import type { Level } from '@/types/database'
import type { LevelProgressSummary } from '@/repositories/interfaces'

export const LEVEL_LOCKED_MESSAGE = 'This level is locked until the previous level is fully learned.'

export function isLevelUnlocked(
  levels: Level[],
  progress: Record<string, LevelProgressSummary> | undefined,
  index: number,
): boolean {
  if (index <= 0) return true

  const previousLevel = levels[index - 1]
  if (!previousLevel) return false

  const previousProgress = progress?.[previousLevel.id]
  const previousTotal = previousProgress?.total ?? previousLevel.word_count
  const previousLearned = previousProgress?.learned ?? 0
  return previousTotal > 0 && previousLearned >= previousTotal
}

export function getLevelIndex(levels: Level[], levelId: string): number {
  return levels.findIndex((level) => level.id === levelId)
}

export function isLevelAccessible(
  levels: Level[],
  progress: Record<string, LevelProgressSummary> | undefined,
  levelId: string,
): boolean {
  const index = getLevelIndex(levels, levelId)
  return index === -1 ? false : isLevelUnlocked(levels, progress, index)
}
