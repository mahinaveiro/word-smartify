import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Security' }

export default function SecuritySettingsPage() {
  return <SettingsView section="security" />
}
