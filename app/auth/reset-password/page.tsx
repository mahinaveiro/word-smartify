import { Suspense } from 'react'
import { ResetPasswordView } from '@/features/auth/reset-password-view'
import { AuthLoading } from '@/features/auth/auth-loading'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ResetPasswordView />
    </Suspense>
  )
}
