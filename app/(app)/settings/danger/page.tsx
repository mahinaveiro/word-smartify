import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Delete account' }

export default function DangerSettingsPage() {
  return <SettingsView section="danger" />
}
