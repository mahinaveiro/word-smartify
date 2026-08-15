import { LibraryWordDetailView } from '@/features/library/library-views'

export default async function LibraryWordPage({ params }: { params: Promise<{ wordId: string }> }) {
  const { wordId } = await params
  return <LibraryWordDetailView wordId={wordId} />
}
