import { WordDetail } from '@/features/learn/word-detail'

export default async function WordPage({ params }: { params: Promise<{ wordId: string }> }) {
  const { wordId } = await params
  return <WordDetail wordId={wordId} />
}
