import { LibraryBookView } from '@/features/library/library-views'

export default async function LibraryBookPage({ params }: { params: Promise<{ bookSlug: string }> }) {
  const { bookSlug } = await params
  return <LibraryBookView bookSlug={bookSlug} />
}
