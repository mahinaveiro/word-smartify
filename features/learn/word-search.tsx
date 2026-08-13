'use client'

import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { useWordSearch } from '@/hooks/use-data'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

export function WordSearchResults({ query }: { query: string }) {
  const { data, isLoading } = useWordSearch(query, 30)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description={`Nothing found for "${query}". Try a different spelling.`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        {data.total.toLocaleString()} result{data.total === 1 ? '' : 's'}
      </p>
      {data.items.map((w) => (
        <Link key={w.id} href={`/word/${w.id}`} className="press block">
          <Card>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-bold">{w.word}</p>
                <p className="truncate text-sm text-muted-foreground">{w.english_meaning}</p>
              </div>
              <Badge variant="muted" className="shrink-0">
                #{w.book_word_number}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
