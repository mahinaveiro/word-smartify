import { LevelDetail } from '@/features/learn/level-detail'

export default async function LevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params
  return <LevelDetail levelId={levelId} />
}
