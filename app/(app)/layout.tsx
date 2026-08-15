import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { RequireAuth } from '@/features/auth/require-auth'
import { OnboardingGate } from '@/features/setup/onboarding-gate'

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </RequireAuth>
  )
}
