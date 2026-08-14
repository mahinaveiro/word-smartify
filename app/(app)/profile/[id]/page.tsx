import type { Metadata } from 'next'
import { PublicProfileView } from '@/features/profile/public-profile-view'

export const metadata: Metadata = { title: 'Learner profile' }

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicProfileView userId={id} />
}
