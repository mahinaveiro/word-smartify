import type { Metadata } from 'next'
import { SettingsView } from '@/features/settings/settings-view'

export const metadata: Metadata = { title: 'Account settings' }

export default function AccountSettingsPage() {
  return <SettingsView section="account" />
}
