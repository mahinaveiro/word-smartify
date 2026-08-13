import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { RequireAuth } from '@/features/auth/require-auth'

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}
