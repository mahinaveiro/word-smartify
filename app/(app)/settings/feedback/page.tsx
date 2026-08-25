import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Help & feedback' }

export default function FeedbackSettingsPage() {
  return <SettingsView section="feedback" />
}
