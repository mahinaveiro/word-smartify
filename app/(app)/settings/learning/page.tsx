import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Learning preferences' }

export default function LearningSettingsPage() {
  return <SettingsView section="learning" />
}
