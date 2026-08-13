import { SessionView } from '@/features/session/session-view'

export default async function SessionPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params
  return <SessionView levelId={levelId} />
}
