import type { LucideIcon } from 'lucide-react'
import { House, GraduationCap, ChartColumn, Trophy, User, Settings, FileText } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** match nested routes, e.g. /learn/... */
  matchPrefix?: boolean
}

/** Primary items shown in the mobile bottom bar and the sidebar's main group. */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: House },
  { label: 'Learn', href: '/learn', icon: GraduationCap, matchPrefix: true },
  { label: 'Progress', href: '/progress', icon: ChartColumn },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
]

/** Secondary items shown only in the desktop sidebar (below the divider). */
export const SECONDARY_NAV: NavItem[] = [
  { label: 'Mock Tests', href: '/mock-tests', icon: FileText, matchPrefix: true },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(item.href + '/')
  return pathname === item.href
}
