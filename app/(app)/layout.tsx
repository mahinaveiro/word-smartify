import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { RequireAuth } from '@/features/auth/require-auth'
import { OnboardingGate } from '@/features/setup/onboarding-gate'
import { ThemeProvider } from '@/components/theme/theme-provider'

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ThemeProvider>
        <OnboardingGate>
          <AppShell>{children}</AppShell>
        </OnboardingGate>
      </ThemeProvider>
    </RequireAuth>
  )
}
