import { LibraryLevelView } from '@/features/library/library-views'

export default async function LibraryLevelPage({ params }: { params: Promise<{ bookSlug: string; levelNumber: string }> }) {
  const { bookSlug, levelNumber } = await params
  return <LibraryLevelView bookSlug={bookSlug} levelNumber={Number(levelNumber)} />
}
