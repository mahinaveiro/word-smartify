import { Suspense } from 'react'
import { CheckEmailView } from '@/features/auth/check-email-view'
import { AuthLoading } from '@/features/auth/auth-loading'

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <CheckEmailView />
    </Suspense>
  )
}
