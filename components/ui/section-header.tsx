import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="font-heading text-base font-bold uppercase tracking-wide">
        {title}
      </h2>
      {action}
    </div>
  )
}
