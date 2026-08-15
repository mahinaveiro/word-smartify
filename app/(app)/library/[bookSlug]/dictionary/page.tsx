import { LibraryDictionaryView } from '@/features/library/library-views'

export default async function LibraryBookDictionaryPage({ params }: { params: Promise<{ bookSlug: string }> }) {
  const { bookSlug } = await params
  return <LibraryDictionaryView bookSlug={bookSlug} />
}
