'use client'

import { Check, X } from 'lucide-react'
import { checkPassword } from '@/lib/password'
import { cn } from '@/lib/utils'

/** Live checklist of the password policy; each rule flips green as it passes. */
export function PasswordChecklist({ value }: { value: string }) {
  const { rules } = checkPassword(value)
  return (
    <ul className="mt-2 grid gap-1.5" aria-live="polite">
      {rules.map((rule) => {
        const ok = value.length > 0 && rule.ok
        return (
          <li key={rule.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                ok
                  ? 'border-mint bg-mint text-mint-foreground'
                  : 'border-muted-foreground/40 text-muted-foreground',
              )}
              aria-hidden
            >
              {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
            </span>
            <span className={cn(ok ? 'text-foreground' : 'text-muted-foreground')}>
              {rule.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
