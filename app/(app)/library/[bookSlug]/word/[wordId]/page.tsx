import { LibraryWordDetailView } from '@/features/library/library-views'

export default async function LibraryBookWordPage({ params }: { params: Promise<{ bookSlug: string; wordId: string }> }) {
  const { bookSlug, wordId } = await params
  return <LibraryWordDetailView bookSlug={bookSlug} wordId={wordId} />
}
