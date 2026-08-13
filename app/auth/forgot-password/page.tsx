import { Suspense } from 'react'
import { ForgotPasswordView } from '@/features/auth/forgot-password-view'
import { AuthLoading } from '@/features/auth/auth-loading'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ForgotPasswordView />
    </Suspense>
  )
}
