import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Profile settings' }

export default function ProfileSettingsPage() {
  return <SettingsView section="profile" />
}
