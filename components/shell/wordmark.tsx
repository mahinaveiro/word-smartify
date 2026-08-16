import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/icon.svg"
        alt=""
        width={32}
        height={32}
        aria-hidden="true"
        className="size-8 shrink-0"
      />
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Word Smartify
      </span>
    </span>
  )
}
