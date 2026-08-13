import { Suspense } from 'react'
import { VerifiedView } from '@/features/auth/verified-view'
import { AuthLoading } from '@/features/auth/auth-loading'

export default function VerifiedPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <VerifiedView />
    </Suspense>
  )
}
