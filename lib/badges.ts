import type { BadgeAward, DisplayBadge, ISODate, ISOTimestamp, UUID } from '@/types/database'

export type BadgeCategory = 'owner' | 'contributor' | 'weekly_champion'
export type BadgeAwardKind = 'permanent' | 'weekly_champion'
export type BadgeTone = 'gold' | 'violet' | 'mint' | 'coral' | 'sky'

export interface BadgeDefinition {
  key: string
  title: string
  shortTitle: string
  description: string
  reason: string
  assetSrc: string
  category: BadgeCategory
  awardKind: BadgeAwardKind
  tone: BadgeTone
  priority: number
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  'word-smartify-owner': {
    key: 'word-smartify-owner',
    title: 'Word Smartify founder',
    shortTitle: 'Founder',
    description: 'The special badge for Word Smartify’s owner and creator.',
    reason: 'This user created and runs Word Smartify.',
    assetSrc: '/badges/star.gif',
    category: 'owner',
    awardKind: 'permanent',
    tone: 'gold',
    priority: 0,
  },
  'contributor-tasnim': {
    key: 'contributor-tasnim',
    title: 'Community contributor',
    shortTitle: 'Contributor',
    description: 'A permanent recognition badge for high-impact community help.',
    reason: 'Tasnim earned this recognition by reporting and helping improve important questions and learning content.',
    assetSrc: '/badges/tasnim.gif',
    category: 'contributor',
    awardKind: 'permanent',
    tone: 'violet',
    priority: 10,
  },
  'contributor-ashik': {
    key: 'contributor-ashik',
    title: 'Community contributor',
    shortTitle: 'Contributor',
    description: 'A permanent recognition badge for high-impact community help.',
    reason: 'Ashik earned this recognition by reporting and helping improve important questions and learning content.',
    assetSrc: '/badges/ashik.gif',
    category: 'contributor',
    awardKind: 'permanent',
    tone: 'violet',
    priority: 10,
  },
  'weekly-1st': {
    key: 'weekly-1st',
    title: 'Defending champion · #1',
    shortTitle: 'Weekly #1',
    description: 'The defending champion badge for finishing first in the previous completed weekly leaderboard.',
    reason: 'This user finished #1 in the previous completed weekly leaderboard.',
    assetSrc: '/badges/weekly_1st.gif',
    category: 'weekly_champion',
    awardKind: 'weekly_champion',
    tone: 'gold',
    priority: 20,
  },
  'weekly-2nd': {
    key: 'weekly-2nd',
    title: 'Defending champion · #2',
    shortTitle: 'Weekly #2',
    description: 'The defending champion badge for finishing second in the previous completed weekly leaderboard.',
    reason: 'This user finished #2 in the previous completed weekly leaderboard.',
    assetSrc: '/badges/weekly_2nd.gif',
    category: 'weekly_champion',
    awardKind: 'weekly_champion',
    tone: 'sky',
    priority: 21,
  },
  'weekly-3rd': {
    key: 'weekly-3rd',
    title: 'Defending champion · #3',
    shortTitle: 'Weekly #3',
    description: 'The defending champion badge for finishing third in the previous completed weekly leaderboard.',
    reason: 'This user finished #3 in the previous completed weekly leaderboard.',
    assetSrc: '/badges/weekly_3rd.gif',
    category: 'weekly_champion',
    awardKind: 'weekly_champion',
    tone: 'coral',
    priority: 22,
  },
}

export function getBadgeDefinition(key: string) {
  return BADGE_DEFINITIONS[key] ?? null
}

function formatDate(value: ISODate | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}

export function formatBadgePeriod(weekStart: ISODate | null, weekEnd: ISODate | null) {
  const start = formatDate(weekStart)
  const end = formatDate(weekEnd)
  if (!start || !end) return null
  return `${start} – ${end}`
}

export function createDisplayBadge(
  key: string,
  input: {
    awardId?: UUID | null
    awardedAt?: ISOTimestamp | null
    weekStart?: ISODate | null
    weekEnd?: ISODate | null
    placement?: number | null
    isCurrent?: boolean
  } = {},
): DisplayBadge | null {
  const definition = getBadgeDefinition(key)
  if (!definition) return null
  return {
    ...definition,
    awardId: input.awardId ?? null,
    awardedAt: input.awardedAt ?? null,
    weekStart: input.weekStart ?? null,
    weekEnd: input.weekEnd ?? null,
    placement: input.placement ?? null,
    isCurrent: input.isCurrent ?? true,
  }
}

export function displayBadgeFromAward(award: BadgeAward) {
  return createDisplayBadge(award.badge_key, {
    awardId: award.id,
    awardedAt: award.awarded_at,
    weekStart: award.week_start,
    weekEnd: award.week_end,
    placement: award.placement,
  })
}

export function sortDisplayBadges(badges: DisplayBadge[]) {
  return [...badges].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}
